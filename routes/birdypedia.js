const Members = require('../helpers/members.js');

const helpers = require('../helpers');
const express = require('express');
const router = express.Router();

router.get('/', async (req, res) => {
  var families = require('../public/data/families.json');

  res.render('birdypedia', {
    families: families.sort((a, b) => a.label.localeCompare(b.label)),
  });
});

router.get('/eggs', async (req, res) => {
  var eggs = helpers.data('eggs');

  var memberpets = req.session.user ? await helpers.MemberPets.fetch({
    'FILTER': `@member:{${req.session.user.id}}`,
    'RETURN': ['birdypetSpecies']
  }).then((memberpets) => memberpets.map((memberpet) => memberpet.birdypetSpecies)) : [];

  for (var egg in eggs) {
    let tmp = eggs[egg].species;

    if (tmp) {
      eggs[egg] = [tmp.filter((bird) => memberpets.includes(bird)).length, tmp.length];
    } else {
      console.log(eggs[egg]);
      delete eggs[egg];
    }
  }

  res.render('birdypedia/eggs', {
    eggs: eggs
  });
});

router.get('/eggs/:egg', async (req, res) => {
  var egg = helpers.data('eggs')[req.params.egg];

  if (egg) {
    egg.name = req.params.egg;

    res.render('birdypedia/egg', {
      egg: egg
    });
  } else {
    res.redirect('/error');
  }
});

router.get('/bird/:code', async (req, res) => {
  var bird = helpers.Birds.findBy("speciesCode", req.params.code);

  if (bird) {
    var memberpets = await helpers.MemberPets.fetch({
      'FILTER': `@birdypetSpecies:{${bird.speciesCode}}`,
      'RETURN': ['member', 'birdypetId']
    });

    var hatched = req.session.user ? memberpets.filter((memberpet) => memberpet.member == req.session.user.id).map((memberpet) => memberpet.birdypetId) : [];

    var birdypets = helpers.BirdyPets.findBy('speciesCode', bird.speciesCode)
      .filter((birdypet) => !birdypet.special)
      .sort(function(a, b) {
        var aIndex = hatched.indexOf(a.id);
        var bIndex = hatched.indexOf(b.id);

        return (aIndex > -1 ? aIndex : Infinity) - (bIndex > -1 ? bIndex : Infinity);
      });

    var members = new Set();

    for (var memberpet of memberpets) {
      members.add(memberpet.member);
    }

    members = await Promise.all([...members].map((id) => {
      return Members.get(id);
    }));


    res.render('birdypedia/bird', {
      page: 'birdypedia/bird',
      bird: bird,
      birdypets: birdypets,
      members: members.filter((member) => member && member.lastLogin && !member.settings.privacy?.includes('profile')),
      hatched: hatched
    });
  } else {
    res.redirect('/birdypedia');
  }
});

module.exports = router;
