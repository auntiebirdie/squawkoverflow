const helpers = require('../helpers');
const express = require('express');
const router = express.Router();

router.get('/', async (req, res) => {
  res.render('birdypedia/index');
});

router.get('/bird/:id', async (req, res) => {
  var birdypet = helpers.BirdyPets.fetch(req.params.id);

  var userpets = await helpers.UserPets.fetch([{
    field: "birdypetId",
    value: req.params.id
  }])

  var members = new Set();

  for (var userpet of userpets) {
    members.add(userpet.member);
  }

  members = await Promise.all([...members].map((id) => {
    return helpers.Redis.get('member', `${id}`);
  }));

  res.render('birdypedia/birdypet', {
    birdypet: birdypet,
    members: members,
    hatched: req.session.user ? userpets.find((userpet) => userpet.member == req.session.user.id) : false
  });
});

router.get('/family', async (req, res) => {
  var birdypets = require('../public/data/birdypets.json').map( (birdypet) => helpers.BirdyPets.format(birdypet));
  var families = require('../public/data/families.json');

  var userpets = req.session.user ? await helpers.UserPets.fetch([{
    field: "member",
    value: req.session.user.id
  }]).then( (userpets) => { return userpets.map((userpet) => userpet.birdypetId) }) : [];

  res.render('birdypedia/family', {
    families: families,
    birdypets: birdypets,
    userpets: userpets
  });
});

router.get('/eggs', async (req, res) => {
  var adjectives = require('../public/data/eggs.json');

  var userpets = req.session.user ? await helpers.UserPets.fetch([{
    field: "member",
    value: req.session.user.id
  }]).then( (userpets) => { return userpets.map((userpet) => userpet.birdypetId) }) : [];

  res.render('birdypedia/eggs', {
    adjectives: adjectives,
    userpets: userpets
  });
});

module.exports = router;
