const helpers = require('../helpers.js');
const express = require('express');
const router = express.Router();

router.get('/', async (req, res) => {
  var members = await helpers.Redis.fetch({
    kind: "member",
    order: {
      field: "username",
      dir: "asc"
    }
  });

  res.render('members/index', {
    members: members
  });
});

router.get('/:id', helpers.Middleware.entityExists, async (req, res) => {
  var member = await helpers.Redis.get('member', req.params.id);

  var userpets = await helpers.UserPets.fetch([{
    field: "member",
    value: member._id
  }]);

  if (member.birdyBuddy) {
    var birdybuddy = userpets.find((userpet) => userpet._id == member.birdyBuddy);
  }

  if (member.flock) {
    var flock = await helpers.Redis.get('flock', member.flock);

    if (flock && flock.member == member._id) {
      var flockpets = userpets.filter((userpet) => userpet.flocks.includes(member.flock));
    }
  }

  res.render('members/member', {
    page: "member",
    member: member,
    birdypets: userpets.length || 0,
    birdybuddy: birdybuddy || {},
    flock: flock || null,
    flockpets: flockpets || {}
  });
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
    families: [...families].sort((a, b) => a.value.localeCompare(b.value))
  });
});

module.exports = router;
