const API = require('../helpers/api.js');

const Birds = require('../helpers/birds.js');
const BirdyPets = require('../helpers/birdypets.js');
const Cache = require('../helpers/cache.js');
const Members = require('../helpers/members.js');
const MemberPets = require('../helpers/memberpets.js');
const Middleware = require('../helpers/middleware.js');
const Redis = require('../helpers/redis.js');

const chance = require('chance').Chance();
const express = require('express');
const router = express.Router();

const {
  GoogleAuth
} = require('google-auth-library');

const auth = new GoogleAuth();

const birdsPerPage = 24;

router.use('/gift', require('./api/gift.js'));

router.get('/aviary/:member', Middleware.entityExists, async (req, res) => {
  var page = --req.query.page * birdsPerPage;
  var filters = [
    `@member:{${req.entities['member']._id}}`,
    req.query.family ? `@family:${req.query.family}` : '',
    req.query.flock ? `@flocks:{${req.query.flock}}` : '',
    req.query.search ? `@nickname|species:${Redis.escape(req.query.search)}` : ''
  ].join(' ');

  var totals = req.query.flock ? await Cache.get('flockTotals', (req.query.flock == 'NONE' ? `NONE-${req.entities['member']._id}` : req.query.flock)) : await Cache.get('aviaryTotals', req.entities['member']._id);

  Redis.fetch('memberpet', {
    'FILTER': filters,
    'SORTBY': req.query.sort,
    'LIMIT': [page, birdsPerPage]
  }).then(async (response) => {
    var myAviary = req.session.user ? req.entities['member']._id == req.session.user : false;
    var wishlist = req.session.user && !myAviary ? await Cache.get('wishlist', req.session.user) : [];
    var output = [];

    for (var memberpet of response.results) {
      var owned = !myAviary && req.session.user ? await Redis.fetch('memberpet', {
        'FILTER': `@member:{${req.session.user}} @birdypetSpecies:{${memberpet.birdypetSpecies}}`,
        'RETURN': ['birdypetId']
      }).then((owned) => owned.results.map((birdypet) => birdypet.birdypetId)) : [];

      output.push({
        ...MemberPets.format(memberpet),
        wishlisted: wishlist[memberpet.family] ? wishlist[memberpet.family].includes(memberpet.birdypetSpecies) : false,
        checkmark: owned.includes(memberpet.birdypetId) ? 2 : (owned.length > 0 ? 1 : 0)
      });
    }

    res.json({
      totalPages: Math.ceil(response.count / birdsPerPage),
      families: Object.keys(totals).filter((key) => totals[key] > 0 && !key.startsWith('_')),
      results: output
    });
  });
});

router.get('/flocks/:flock', Middleware.entityExists, (req, res) => {
  var page = --req.query.page * birdsPerPage;
  var filters = [
    `@member:{${req.entities['flock'].member}}`,
    `@flocks:{${req.entities['flock']._id}}`,
    req.query.search ? `@nickname|species:${Redis.escape(req.query.search)}` : ''
  ].join(' ');

  Redis.fetch('memberpet', {
    'FILTER': filters,
    'SORTBY': req.query.sort,
    'LIMIT': [page, birdsPerPage]
  }).then((response) => {
    var output = response.results.map((memberpet) => {
      return MemberPets.format(memberpet);
    });

    res.json({
      totalPages: Math.ceil(response.count / birdsPerPage),
      results: output
    });
  });
});

router.get('/birdypedia', async (req, res) => {
  var page = --req.query.page * birdsPerPage;
  var wishlist = req.session.user ? await Cache.get('wishlist', req.session.user) : [];
  var output = [];

  if (req.query.family) {
    var birds = Birds.fetch("family", req.query.family);
  } else {
    var birds = Birds.all().filter((bird) => req.query.adjectives ? bird.adjectives.includes(req.query.adjectives) : true);
  }

  if (req.query.search) {
    birds = birds.filter((bird) => bird.commonName.toLowerCase().includes(req.query.search.toLowerCase()));
  }

  var totalPages = birds.length;

  birds.sort((a, b) => a.commonName.localeCompare(b.commonName));

  for (var i = page, len = Math.min(page + birdsPerPage, birds.length); i < len; i++) {
    birds[i].wishlisted = wishlist[birds[i].family] ? wishlist[birds[i].family].includes(birds[i].speciesCode) : false;
    birds[i].variants = BirdyPets.findBy('speciesCode', birds[i].speciesCode).filter((birdypet) => !birdypet.special);

    if (req.session.user) {
      for (var variant of birds[i].variants) {
        await Redis.fetch('memberpet', {
          'FILTER': `@member:{${req.session.user}} @birdypetId:{${variant.id}}`,
          'COUNT': true
        }).then((response) => {
          variant.hatched = response.count;
        });
      }

      if (birds[i].variants.length > 0) {
        birds[i].variants.sort((a, b) => Number(b.hatched) - Number(a.hatched));
      } else {
        birds[i].SKIP = true;
      }
    }

    if (birds[i].variants.length > 0) {
      output.push(birds[i]);
    }
  }

  res.json({
    totalPages: Math.ceil(totalPages / birdsPerPage),
    results: output
  });
});

router.put('/flocks/:flock', Middleware.isLoggedIn, Middleware.entityExists, Middleware.userOwnsEntity, (req, res) => {
  Redis.set('flock', req.entities['flock']._id, {
    name: req.body.name || req.entities['flock'].name,
    description: req.body.description || req.entities['flock'].description,
    displayOrder: req.body.displayOrder || req.entities['flock'].displayOrder || 100
  });

  res.json("ok");
});

router.delete('/flocks/:flock', Middleware.isLoggedIn, Middleware.entityExists, Middleware.userOwnsEntity, async (req, res) => {
  await Redis.delete('flock', req.entities['flock']._id);

  res.json("ok");
});

router.post('/flocks/:flock/:memberpet', Middleware.isLoggedIn, Middleware.entityExists, Middleware.userOwnsEntity, (req, res) => {
  var index = req.entities['memberpet'].flocks ? req.entities['memberpet'].flocks.indexOf(req.entities['flock']._id) : -1;
  var flocks = req.entities['memberpet'].flocks ? req.entities['memberpet'].flocks.split(",") : [];

  if (index !== -1) {
    flocks = flocks.splice(index, -1);
  } else {
    flocks.push(req.entities['flock']._id);
  }

  Redis.set('memberpet', req.entities['memberpet']._id, {
    flocks: flocks.join(',')
  }).then(() => {
    res.json({
      action: index !== -1 ? "remove" : "add"
    });
  });
});

router.all('/*', async (req, res) => {
  let data = (req.method == "GET" ? req.query : req.body) || {};

  data.loggedInUser = req.session.user;

  API.call(req.path.match(/\/?(\b[A-Za-z]+\b)/)[1], req.method, data).then((response) => {
    res.json(response);
  }).catch((err) => {
	  console.log(err);
  });
});

module.exports = router;
