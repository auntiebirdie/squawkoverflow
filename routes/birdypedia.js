const helpers = require('../helpers');
const express = require('express');
const router = express.Router();

router.get('/', async (req, res) => {
  res.render('birdypedia/index');
});

router.get('/family', async (req, res) => {
  var userpets = req.session.user ? await helpers.DB.fetch({
    "kind": "MemberPet",
    "filters": [
      ["member", "=", req.session.user.id]
    ]
  }).then((userpets) => {
    return userpets.map((userpet) => userpet.birdypet);
  }) : [];

  res.render('birdypedia/family', {
    userpets: userpets
  });
});

router.get('/eggs', async (req, res) => {
  var adjectives = require('../public/data/adjectives.json');

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