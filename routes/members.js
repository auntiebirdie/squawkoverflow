const helpers = require('../helpers.js');
const express = require('express');
const router = express.Router();

router.get('/', async (req, res) => {
  var members = await helpers.Redis.fetch({
    "kind": "member",
    "limit": 100
  });

  res.render('members/index', {
    members: members.sort((a, b) => a.username.localeCompare(b.username))
  });
});

router.get('/:id', async (req, res) => {
  var member = await helpers.Redis.get('member', req.params.id);

  if (member) {
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
  } else {
    console.error(`ERROR - member ${req.params.id} not found`);
    res.redirect('/error');
  }
});

module.exports = router;