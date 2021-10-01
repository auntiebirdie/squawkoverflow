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

router.get('/flocks/:MemberFlock/:MemberPet', helpers.Middleware.isLoggedIn, helpers.Middleware.entityExists, helpers.Middleware.userOwnsEntity, (req, res) => {
  var index = req.entities['MemberPet'].flocks ? req.entities['MemberPet'].flocks.indexOf(req.entities['MemberFlock']._id) : -1;
  var flocks = req.entities['MemberPet'].flocks ? req.entities['MemberPet'].flocks : [];

  if (index !== -1) {
    flocks = flocks.splice(index, -1);
  } else {
    flocks.push(req.entities['MemberFlock']._id);
  }

  helpers.DB.set('MemberPet', req.entities['MemberPet']._id, {
    flocks: flocks
  }).then(() => {
    res.json({
      action: index !== -1 ? "remove" : "add"
    });
  });
});

module.exports = router;
