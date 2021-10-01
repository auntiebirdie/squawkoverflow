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
    var birdypets = await helpers.Redis.fetch({
      'kind': 'memberpet',
      'filters': [
        ['member', '=', req.params.id]
      ],
      'keysOnly': true
    });

    if (member.birdyBuddy) {
      var birdybuddy = await helpers.Redis.get('member[et', member.birdyBuddy).then((userpet) => {
        if (userpet && userpet.member == member._id) {
          return {
            id: userpet._id,
            nickname: userpet.nickname,
            hatchedAt: userpet.hatchedAt,
            friendship: userpet.friendship || 0,
            birdypet: helpers.BirdyPets.fetch(userpet.birdypet)
          }
        } else {
          return {}
        }
      });

      if (member.flock) {
        var flock = await helpers.Redis.get('flock', member.flock);

        if (flock && flock.member == member._id) {
          var flockpets = await helpers.Redis.fetch({
            'kind': 'memberpet',
            'filters': [
              ['member', '=', req.params.id],
              ['flocks', '=', `${member.flock}`]
            ]
          }).then((userpets) => {
            return userpets.map((userpet) => {
              return {
                id: userpet._id,
                nickname: userpet.nickname,
                birdypet: helpers.BirdyPets.fetch(userpet.birdypet)
              }
            });
          });
        }
      }
    }

    res.render('members/member', {
	   page: "member",
      member: member,
      birdypets: birdypets.length || 0,
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
