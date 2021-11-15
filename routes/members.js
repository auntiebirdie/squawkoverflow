const Cache = require('../helpers/cache.js');
const Members = require('../helpers/members.js');

const helpers = require('../helpers.js');
const express = require('express');
const router = express.Router();

router.get('/', async (req, res) => {
  var members = await Members.all();

  res.render('members/index', {
    members: members
  });
});

router.get('/:member', helpers.Middleware.entityExists, async (req, res) => {
  if (req.entities['member']._id != req.session.user && req.entities['member'].settings.privacy?.includes('profile')) {
    return res.redirect('/error');
  }

  var output = {
    page: 'member',
    member: await Members.get(req.entities['member']._id),
    bugs: 0,
    aviary: await helpers.Redis.fetch('memberpet', {
      "FILTER": `@member:{${req.entities['member']._id}}`,
      "COUNT": true
    }) || 0,
    flock: {}
  };

  output.member.wishlist = await Cache.get('wishlist', req.entities['member']._id).then( (results) => Object.keys(results).length > 0 );

  if (output.member.birdyBuddy) {
    output.member.birdyBuddy = await helpers.MemberPets.get(output.member.birdyBuddy);
  }

  if (output.member.flock) {
    output.member.flock = await helpers.Redis.get('flock', output.member.flock);
  }

  if (req.session.user) {
    output.bugs = await helpers.Redis.get('member', req.session.user, 'bugs') || 0;
  }

  res.render('members/member', output);
});

router.get('/:member/gift', helpers.Middleware.isLoggedIn, helpers.Middleware.entityExists, async (req, res) => {
  if (req.entities['member'].settings.privacy?.includes('gifts')) {
    return res.redirect('/error');
  }

  var allFamilies = require('../public/data/families.json');
  var families = new Set();

  var flocks = await helpers.Redis.fetch('flock', {
    "FILTER": `@member:{${req.session.user}}`,
    "SORTBY": ["name", "DESC"]
  });

  await helpers.Redis.fetch('memberpet', {
    'FILTER': `@member:{${req.session.user}}`,
    'RETURN': ['family'],
  }).then((response) => {
    response.results.forEach((item) => {
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
