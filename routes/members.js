const helpers = require('../helpers.js');
const express = require('express');
const router = express.Router();

router.get('/', async (req, res) => {
  var members = await helpers.Redis.scan('member', {
    'SORTBY': ['username']
  });

  res.render('members/index', {
    members: members
  });
});

router.get('/:member', helpers.Middleware.entityExists, async (req, res) => {
  var output = {
    page: 'member',
    member: req.entities['member'],
    bugs: 0,
    aviary: await helpers.Redis.fetch('memberpet', {
      "FILTER": `@member:{${req.entities['member']._id}}`,
      "COUNT": true
    }) || 0,
    flock: {}
  };

  if (output.member.birdyBuddy) {
    output.member.birdyBuddy = await helpers.MemberPets.get(output.member.birdyBuddy);
  }

  if (output.member.flock) {
    output.member.flock = await helpers.Redis.get('flock', output.member.flock);
  }

  if (req.session.user) {
    output.bugs = await helpers.Redis.get('member', req.session.user.id, 'bugs') || 0;
  }

  res.render('members/member', output);
});

router.get('/:member/gift', helpers.Middleware.isLoggedIn, helpers.Middleware.entityExists, async (req, res) => {
  var allFamilies = require('../public/data/families.json');
  var families = new Set();

  var flocks = await helpers.Redis.fetch('flock', {
    "FILTER": `@member:{${req.session.user.id}}`,
    "SORTBY": ["name", "DESC"]
  });

  await helpers.Redis.fetch('memberpet', {
    'FILTER': `@member:{${req.session.user.id}}`,
    'RETURN': ['family'],
  }).then((response) => {
    response.forEach((item) => {
      var family = allFamilies.find((a) => a.value == item.family);

      if (family) {
        families.add(family);
      }
    });
  });

  res.render('members/gift', {
    page: 'gift',
    member: req.entities['member'],
    flocks: flocks,
    families: [...families].sort((a, b) => a.value.localeCompare(b.value))
  });
});

module.exports = router;
