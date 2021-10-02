const helpers = require('../helpers');
const express = require('express');
const router = express.Router();

router.get('/', async (req, res) => {
  var members = await helpers.DB.fetch({
    "kind": "Member"
  });

  res.render('members/index', {
    members: members
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
      var birdybuddy = userpets.find( (userpet) => userpet._id == member.birdyBuddy);
	    console.log(birdybuddy);
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
