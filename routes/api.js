const helpers = require('../helpers.js');
const express = require('express');
const router = express.Router();

router.post('/aviary/:member', helpers.Middleware.entityExists, (req, res) => {
	var page = req.body.page || 1;

  helpers.Redis.fetch('memberpet', {
    'FILTER': `@member:{${req.entities['member']._id}}`,
    'SORTBY':  req.body.sort,
    'LIMIT': [(page - 1) * 10, 10]
  }).then((response) => {
    res.json(response.map( (memberpet) => {
	    return {
		    ...memberpet,
		    ...helpers.BirdyPets.format(helpers.BirdyPets.fetch(memberpet.birdypetId))
	    };
    }));
  });
});

router.get('/birdypedia/family/:family', async (req, res) => {
  var birdypets = helpers.BirdyPets.findBy('species.family', req.params.family.toLowerCase());
  var birds = {};

  for (var birdypet of birdypets) {
    if (!birds[birdypet.species.speciesCode]) {
      birds[birdypet.species.speciesCode] = {
        species: birdypet.species,
        variants: []
      }
    }

    birds[birdypet.species.speciesCode].variants.push({
      id: birdypet.id,
      image: birdypet.image
    });
  }

  res.json(Object.values(birds).sort((a, b) => a.species.commonName.localeCompare(b.species.commonName)));
});

router.get('/birdypedia/eggs/:adjective', async (req, res) => {
  var birdypets = helpers.BirdyPets.findBy('adjectives', req.params.adjective);
  var birds = {};

  for (var birdypet of birdypets) {
    if (!birds[birdypet.species.speciesCode]) {
      birds[birdypet.species.speciesCode] = {
        species: birdypet.species,
        variants: []
      }
    }

    birds[birdypet.species.speciesCode].variants.push({
      id: birdypet.id,
      image: birdypet.image
    });
  }

  res.json(Object.values(birds).sort((a, b) => a.species.commonName.localeCompare(b.species.commonName)));
});

router.post('/gift/:member/:memberpet', helpers.Middleware.isLoggedIn, helpers.Middleware.entityExists, (req, res, next) => {
  helpers.Redis.set('memberpet', req.entities['memberpet']._id, {
    "member": req.entities['member']._id,
    "flocks": "",
    "friendship": 0
  }).then(() => {
    var birdypet = helpers.BirdyPets.fetch(req.entities['memberpet'].birdypetId);

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

router.get('/flocks/:flock/:memberpet', helpers.Middleware.isLoggedIn, helpers.Middleware.entityExists, helpers.Middleware.userOwnsEntity, (req, res) => {
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

router.get('/freebirds/:freebird', helpers.Middleware.isLoggedIn, async (req, res) => {
  var freebird = await helpers.Redis.get('freebird', req.params.freebird);

  if (freebird) {
    var birdypet = helpers.BirdyPets.fetch(req.params.freebird);

    helpers.Redis.create('memberpet', {
      birdypetId: birdypet.id,
      birdypetSpecies: birdypet.species.speciesCode,
      member: req.session.user.id,
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
  var bird = helpers.Birds.fetchBy('speciesCode', req.params.speciescode);

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
