const Birds = require('../helpers/birds.js');
const BirdyPets = require('../helpers/birdypets.js');
const Cache = require('../helpers/cache.js');
const Members = require('../helpers/members.js');

const express = require('express');
const router = express.Router();

router.get('/', async (req, res) => {
  var families = require('../public/data/families.json');

  res.render('birdypedia', {
    families: families.map( (family) => family.value ),
    currentPage: (req.query.page || 1) * 1
  });
});

router.get('/eggs', async (req, res) => {
  res.render('birdypedia/eggs', {
    eggs: require('../public/data/eggs.json')
  });
});

router.get('/eggs/:egg', async (req, res) => {
  var egg = require('../public/data/eggs.json')[req.params.egg];

  if (egg) {
    egg.name = req.params.egg;

    res.render('birdypedia/egg', {
      egg: egg,
      currentPage: (req.query.page || 1) * 1
    });
  } else {
    res.redirect('/error');
  }
});

router.get('/bird/:code', async (req, res) => {
  var bird = Birds.findBy("speciesCode", req.params.code);
  var variant = req.query.variant;

  if (bird) {
    var memberpets = await MemberPets.fetch({
      'FILTER': `@birdypetSpecies:{${bird.speciesCode}}`,
      'RETURN': ['member', 'birdypetId']
    });

    var hatched = req.session.user ? memberpets.filter((memberpet) => memberpet.member == req.session.user).map((memberpet) => memberpet.birdypetId) : [];

    var birdypets = BirdyPets.findBy('speciesCode', bird.speciesCode)
      .filter((birdypet) => !birdypet.special)
      .sort(function(a, b) {
        if (variant) {
          var aIndex = `${a.prefix}-${a.alias}` == variant ? 1 : -1;
          var bIndex = `${b.prefix}-${b.alias}` == variant ? 1 : -1;
        } else {
          var aIndex = hatched.indexOf(a.id);
          var bIndex = hatched.indexOf(b.id);
        }

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
