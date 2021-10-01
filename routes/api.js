const helpers = require('../helpers');
const express = require('express');
const router = express.Router();

router.get('/birdypedia/family/:family', async (req, res) => {
  var birdypets = require('../public/data/birdypets.json').filter((birdypet) => birdypet.species.family.toLowerCase() == req.params.family.toLowerCase());

  res.json(birdypets);
});

router.get('/birdypedia/eggs/:adjective', async (req, res) => {
  var birdypets = require('../public/data/birdypets.json').filter((birdypet) => birdypet.adjectives.includes(req.params.adjective));

  res.json(birdypets);
});

router.get('/flocks/:flock/:memberpet', helpers.Middleware.isLoggedIn, helpers.Middleware.entityExists, helpers.Middleware.userOwnsEntity, (req, res) => {
  var index = req.entities['memberpet'].flocks ? req.entities['member[et'].flocks.indexOf(req.entities['flock']._id) : -1;
  var flocks = req.entities['memberpet'].flocks ? req.entities['memberpet'].flocks : [];

  if (index !== -1) {
    flocks = flocks.splice(index, -1);
  } else {
    flocks.push(req.entities['flock']._id);
  }

  helpers.redis.set('memberpet', req.entities['memberpet']._id, {
    flocks: flocks.join(',')
  }).then(() => {
    res.json({
      action: index !== -1 ? "remove" : "add"
    });
  });
});

module.exports = router;
