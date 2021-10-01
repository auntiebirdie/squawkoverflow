const helpers = require('../helpers');
const express = require('express');
const router = express.Router();

router.get('/', async (req, res) => {
  res.render('birdypedia/index');
});

router.get('/bird/:id', async (req, res) => {
  var birdypet = require('../public/data/birdypets.json').find( (birdypet) => birdypet.id == req.params.id );

  var userpets = await helpers.DB.fetch({
	  "kind": "MemberPet",
	  "filters": [
		  ["birdypet", "=", req.params.id]
	  ]
  });

  var members = [];

  for (var userpet of userpets) {
    members.push(await helpers.DB.get('Member', `${userpet.member}`));
  }

  res.render('birdypedia/birdypet', {
    birdypet: birdypet,
	  members: members,
    hatched : req.session.user ? userpets.find( (userpet) => userpet.member == req.session.user.id) : false
  });
});

router.get('/family', async (req, res) => {
  var birdypets = require('../public/data/birdypets.json');
  var families = require('../public/data/families.json'); 

  var userpets = req.session.user ? await helpers.DB.fetch({
    "kind": "MemberPet",
    "filters": [
      ["member", "=", req.session.user.id]
    ]
  }).then((userpets) => {
    return userpets.map((userpet) => userpet.birdypet);
  }) : [];

  res.render('birdypedia/family', {
    families: families,
    birdypets: birdypets,
    userpets: userpets
  });
});

router.get('/eggs', async (req, res) => {
  var adjectives = require('../public/data/eggs.json');

  var userpets = req.session.user ? await helpers.DB.fetch({
    "kind": "MemberPet",
    "filters": [
      ["member", "=", req.session.user.id]
    ]
  }).then((userpets) => {
    return userpets.map((userpet) => userpet.birdypet);
  }) : [];

  res.render('birdypedia/eggs', {
    adjectives: adjectives,
    userpets: userpets
  });
});

module.exports = router;
