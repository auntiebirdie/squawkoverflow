const helpers = require('../helpers.js');
const express = require('express');
const router = express.Router();

router.get('/aviary/:member', helpers.Middleware.entityExists, (req, res) => {
  var page = --req.query.page * 25;
  var filters = [
    `@member:{${req.entities['member']._id}}`,
    req.query.family ? `@family:${req.query.family}` : '',
    req.query.flock ? `@flocks:{${req.query.flock}}` : '',
    req.query.search ? `@nickname|species:${helpers.Redis.escape(req.query.search)}` : ''
  ].join(' ');

  helpers.Redis.fetch('memberpet', {
    'FILTER': filters,
    'SORTBY': req.query.sort,
    'LIMIT': [page, 25]
  }).then(async (response) => {
    var myAviary = req.session.user ? req.entities['member']._id == req.session.user.id : false;
    var wishlist = req.session.user && !myAviary ? await helpers.Redis.get('wishlist', req.session.user.id) : [];
    var output = [];

    for (var memberpet of response) {
      var owned = !myAviary ? await helpers.Redis.fetch('memberpet', {
        'FILTER': `@member:{${req.session.user.id}} @birdypetSpecies:{${memberpet.birdypetSpecies}}`,
        'RETURN': ['birdypetId']
      }).then((owned) => owned.map((birdypet) => birdypet.birdypetId)) : [];

      output.push({
        ...helpers.MemberPets.format(memberpet),
        wishlisted: wishlist.includes(memberpet.birdypetSpecies),
        checkmark: owned.includes(memberpet.birdypetId) ? 2 : (owned.length > 0 ? 1 : 0)
      });
    }

    res.json(output);
  });
});

router.get('/gift/:member', helpers.Middleware.isLoggedIn, helpers.Middleware.entityExists, (req, res) => {	
  var page = --req.query.page * 25;
  var filters = [
    `@member:{${req.session.user.id}}`,
    req.query.family ? `@family:${req.query.family}` : '',
    req.query.flock ? `@flocks:{${req.query.flock}}` : '',
    req.query.search ? `@nickname|species:${helpers.Redis.escape(req.query.search)}` : ''
  ].join(' ');

  helpers.Redis.fetch('memberpet', {
    'FILTER': filters,
    'SORTBY': req.query.sort,
    'LIMIT': [page, 25]
  }).then(async (response) => {
    var wishlist = await helpers.Redis.get('wishlist', req.entities['member']._id);
    var output = [];

    for (var memberpet of response) {
      var owned = await helpers.Redis.fetch('memberpet', {
        'FILTER': `@member:{${req.entities['member']._id}} @birdypetSpecies:{${memberpet.birdypetSpecies}}`,
        'RETURN': ['birdypetId']
      }).then((owned) => owned.map((birdypet) => birdypet.birdypetId));

      output.push({
        ...helpers.MemberPets.format(memberpet),
        wishlisted: wishlist.includes(memberpet.birdypetSpecies),
        checkmark: owned.includes(memberpet.birdypetId) ? 2 : (owned.length > 0 ? 1 : 0)
      });
    }

    res.json(output);
  });
});

router.get('/wishlist/:member', helpers.Middleware.entityExists, async (req, res) => {
  var page = --req.query.page * 25;
  var birds = await helpers.Redis.get('wishlist', req.entities['member']._id).then((birds) => birds.map((bird) => helpers.Birds.findBy('speciesCode', bird))) || [];
  var output = [];

  if (req.query.family) {
    birds = birds.filter((bird) => bird.family.toLowerCase() == req.query.family.toLowerCase());
  }

  if (req.query.search) {
    birds = birds.filter((bird) => bird.commonName.toLowerCase().includes(req.query.search.toLowerCase()) || bird.nickname?.toLowerCase().includes(req.query.search.toLowerCase()));
  }

  birds.sort((a, b) => a.commonName.localeCompare(b.commonName));

  for (var i = page, len = Math.min(page + 25, birds.length); i < len; i++) {
    birds[i].hatched = req.session.user ? await helpers.Redis.fetchOne('memberpet', {
      'FILTER': `@member:{${req.session.user.id}} @birdypetSpecies:{${birds[i].speciesCode}}`
    }) : false;

    birds[i].variants = helpers.BirdyPets.findBy('speciesCode', birds[i].speciesCode).filter( (birdypet) => !birdypet.special);

    output.push(birds[i]);
  }

  res.json(output);
});

router.get('/flocks/:flock', helpers.Middleware.entityExists, (req, res) => {
  var page = --req.query.page * 25;
  var filters = [
    `@member:{${req.entities['flock'].member}}`,
    `@flocks:{${req.entities['flock']._id}}`,
    req.query.search ? `@nickname|species:${helpers.Redis.escape(req.query.search)}` : ''
  ].join(' ');

  helpers.Redis.fetch('memberpet', {
    'FILTER': filters,
    'SORTBY': req.query.sort,
    'LIMIT': [page, 25]
  }).then((response) => {
    res.json(response.map((memberpet) => {
      return helpers.MemberPets.format(memberpet);
    }));
  });
});

router.get('/birdypedia', async (req, res) => {
  var page = --req.query.page * 25;
  var wishlist = req.session.user ? await helpers.Redis.get('wishlist', req.session.user.id) : [];
  var output = [];

  if (req.query.family) {
    var birds = helpers.Birds.fetch("family", req.query.family);
  } else {
    var birds = helpers.Birds.all().filter((bird) => req.query.adjectives ? bird.adjectives.includes(req.query.adjectives) : true);
  }

  if (req.query.search) {
    birds = birds.filter((bird) => bird.commonName.toLowerCase().includes(req.query.search.toLowerCase()));
  }

  birds.sort((a, b) => a.commonName.localeCompare(b.commonName));

  for (var i = page, len = Math.min(page + 25, birds.length); i < len; i++) {
    birds[i].wishlisted = wishlist.includes(birds[i].speciesCode);
    birds[i].variants = helpers.BirdyPets.findBy('speciesCode', birds[i].speciesCode).filter( (birdypet) => !birdypet.special );

    if (req.session.user) {
      for (var variant of birds[i].variants) {
        variant.hatched = await helpers.Redis.fetchOne('memberpet', {
          'FILTER': `@member:{${req.session.user.id}} @birdypetId:{${variant.id}}`
        }) !== null;
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

  res.json(output);
});

router.post('/gift/:member/:memberpet', helpers.Middleware.isLoggedIn, helpers.Middleware.entityExists, (req, res, next) => {
  helpers.Redis.set('memberpet', req.entities['memberpet']._id, {
    "member": req.entities['member']._id,
    "flocks": "NONE",
    "friendship": 0
  }).then(() => {
    var birdypet = helpers.BirdyPets.fetch(req.entities['memberpet'].birdypetId);

    helpers.Redis.get('member', req.session.user.id).then((member) => {
      if (member.birdyBuddy == req.entities['memberpet']._id) {
        helpers.Redis.set('member', member._id, {
          birdyBuddy: null
        });
      }

      helpers.Discord.Webhook.send('exchange', {
        from: req.session.user,
        to: req.entities['member']._id,
        userpet: req.entities['memberpet'],
        birdypet: birdypet
      });

      res.json({
        error: false
      });
    });
  });
});

router.get('/birdypet/:memberpet/feedBug', helpers.Middleware.isLoggedIn, helpers.Middleware.entityExists, async (req, res) => {
  var bugs = await helpers.Redis.get('member', req.session.user.id, 'bugs');

  if (bugs > 0) {
    await helpers.Redis.increment('member', req.session.user.id, 'bugs', -1);

    await helpers.Redis.increment('memberpet', req.entities['memberpet']._id, "friendship", 5);
    res.json({
      bugs: bugs - 1,
      response: helpers.Chance.pickone([
        "Mmm!  Tastes like... bug.",
        "Tasty!",
        "Thanks!",
        "More?",
        "Oooh, that one was still wiggling.",
        "Yum!",
        "Another one!!"
      ])
    });
  } else {
    res.json({
      error: "You don't have any more bugs!"
    });
  }
});

router.put('/flocks/:flock', helpers.Middleware.isLoggedIn, helpers.Middleware.entityExists, helpers.Middleware.userOwnsEntity, (req, res) => {
  helpers.Redis.set('flock', req.entities['flock']._id, {
	  name: req.body.name || req.entities['flock'].name,
	  description: req.body.description || req.entities['flock'].description,
	  displayOrder: req.body.displayOrder || req.entities['flock'].displayOrder || 100
  });

  res.json("ok");
});

router.post('/flocks/:flock/:memberpet', helpers.Middleware.isLoggedIn, helpers.Middleware.entityExists, helpers.Middleware.userOwnsEntity, (req, res) => {
  var index = req.entities['memberpet'].flocks ? req.entities['memberpet'].flocks.indexOf(req.entities['flock']._id) : -1;
  var flocks = req.entities['memberpet'].flocks ? req.entities['memberpet'].flocks.split(",") : [];

  if (index !== -1) {
    flocks = flocks.splice(index, -1);
  } else {
    flocks.push(req.entities['flock']._id);
  }

  helpers.Redis.set('memberpet', req.entities['memberpet']._id, {
    flocks: flocks.join(',')
  }).then(() => {
    res.json({
      action: index !== -1 ? "remove" : "add"
    });
  });
});

router.post('/freebirds/:freebird', helpers.Middleware.isLoggedIn, async (req, res) => {
  var freebird = await helpers.Redis.get('freebird', req.params.freebird);

  if (freebird) {
    var birdypet = helpers.BirdyPets.fetch(req.params.freebird);

    helpers.Redis.create('memberpet', {
      birdypetId: birdypet.id,
      birdypetSpecies: birdypet.speciesCode,
      species: birdypet.species.commonName,
      family: birdypet.species.family,
      member: req.session.user.id,
      flocks: "NONE",
      hatchedAt: Date.now()
    }).then((id) => {
      helpers.Redis.delete('freebird', req.params.freebird);

      res.json({
        response: `<a href="/birdypet/${id}">${birdypet.species.commonName}</a>`
      });
    });
  } else {
    res.json({
      error: "Someone already claimed this bird!"
    });
  }
});

router.post('/wishlist/:action/:speciescode', helpers.Middleware.isLoggedIn, async (req, res) => {
  var bird = helpers.Birds.findBy('speciesCode', req.params.speciescode);

  if (bird) {
    helpers.Redis[req.params.action == "add" ? "push" : "pop"]('wishlist', req.session.user.id, bird.speciesCode);

    res.json({
      response: "success"
    });
  } else {
    res.json({
      error: "not found"
    });
  }
});

module.exports = router;
