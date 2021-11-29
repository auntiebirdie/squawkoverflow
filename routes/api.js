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
  let data = (req.method == "GET" || req.method == "HEAD" ? req.query : req.body) || {};

  data.loggedInUser = req.session.user;

  API.call(req.path.match(/\/?(\b[A-Za-z]+\b)/)[1], req.method, data).then((response) => {
    res.json(response);
  }).catch((err) => {
	  console.log(err);
  });
});

module.exports = router;
