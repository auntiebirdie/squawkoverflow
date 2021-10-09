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

router.get('/:id/gift', helpers.Middleware.isLoggedIn, helpers.Middleware.entityExists, async (req, res) => {
  var allFamilies = require('../public/data/families.json');

  var families = new Set();

  var flocks = await helpers.Redis.fetch({
    "kind": "flock",
    "filters": [{
      field: "member",
      value: req.session.user.id
    }]
  });

  var wishlist = await helpers.Redis.get('wishlist', req.entity._id);

  var myPets = await helpers.UserPets.fetch([{
    field: "member",
    value: req.session.user.id
  }]).then((userpets) => {
    return userpets.map((userpet) => {
      families.add(allFamilies.find((a) => a.value == userpet.birdypet.species.family));

      return {
        ...userpet,
        flocks: userpet.flocks.filter((id) => flocks.find((flock) => flock._id == id))
      }
    }).sort(function(a, b) {
      var aIndex = wishlist.indexOf(a.birdypet.species.speciesCode);
      var bIndex = wishlist.indexOf(b.birdypet.species.speciesCode);

      return (aIndex > -1 ? aIndex : Infinity) - (bIndex > -1 ? bIndex : Infinity);
    });
  });

  var theirPets = new Set();

  await helpers.UserPets.fetch([{
    field: "member",
    value: req.entity._id
  }]).then((userpets) => {
    userpets.forEach((userpet) => {
      theirPets.add(userpet.birdypetId);
      theirPets.add(userpet.birdypetSpecies);
    });
  });

  res.render('members/gift', {
    member: req.entity,
    myPets: myPets,
    theirPets: [...theirPets],
    flocks: flocks,
    families: [...families].sort((a, b) => a.value.localeCompare(b.value)),
    wishlist: wishlist || []
  });
});

module.exports = router;
