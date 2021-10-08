const helpers = require('../helpers');
const express = require('express');
const router = express.Router();

router.get('/', async (req, res) => {
  res.render('birdypedia/index');
});

router.get('/bird/:code', async (req, res) => {
  var bird = helpers.Birds.fetchBy("speciesCode", req.params.code);

  if (bird) {
    var userpets = await helpers.UserPets.fetch([{
      field: "birdypetSpecies",
      value: bird.speciesCode
    }]);

    var hatched = req.session.user ? userpets.filter((userpet) => userpet.member == req.session.user.id).map((userpet) => userpet.birdypetId) : [];

    var birdypets = require('../public/data/birdypets.json')
      .filter((birdypet) => birdypet.species.speciesCode == bird.speciesCode)
      .map((birdypet) => helpers.BirdyPets.format(birdypet))
      .sort(function(a, b) {
        var aIndex = hatched.indexOf(a.id);
        var bIndex = hatched.indexOf(b.id);

        return (aIndex > -1 ? aIndex : Infinity) - (bIndex > -1 ? bIndex : Infinity);
      });

    var members = new Set();

    for (var userpet of userpets) {
      members.add(userpet.member);
    }

    members = await Promise.all([...members].map((id) => {
      return helpers.Redis.get('member', `${id}`);
    }));

    res.render('birdypedia/bird', {
      bird: bird,
      birdypets: birdypets,
      members: members,
      hatched: hatched
    });
  } else {
    res.redirect('/error');
  }
});

router.get('/family/:family?', async (req, res) => {
  var families = require('../public/data/families.json');

  res.render('birdypedia/family', {
    families: families.sort((a, b) => a.label.localeCompare(b.label)),
    selectedFamily: req.params.family
  });
});

router.get('/eggs', async (req, res) => {
  var adjectives = require('../public/data/eggs.json');

  var userpets = req.session.user ? await helpers.UserPets.fetch([{
    field: "member",
    value: req.session.user.id
  }]).then((userpets) => {
    return userpets.map((userpet) => userpet.birdypetId)
  }) : [];

  res.render('birdypedia/eggs', {
    adjectives: adjectives,
    userpets: userpets
  });
});

module.exports = router;
