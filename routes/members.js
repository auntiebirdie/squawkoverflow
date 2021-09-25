const helpers = require('../helpers');
const express = require('express');
const router = express.Router();

router.get('/', async (req, res) => {
  var members = await helpers.DB.fetch({
    "cacheId": "members",
    "kind": "Member"
  });

  res.render('members/index', {
    members: members
  });
});

router.get('/:id', async (req, res) => {
  var member = await helpers.DB.get('Member', req.params.id);

  if (member) {
    var submissions = await helpers.DB.fetch({
      'kind': 'Photo',
      'filters': [
        ['submittedBy', '=', req.params.id]
      ],
      'keysOnly': true
    });

    var birdypets = await helpers.DB.fetch({
      'kind': 'MemberPet',
      'filters': [
        ['member', '=', req.params.id]
      ],
      'keysOnly': true
    });

    if (member.birdyBuddy) {
      var birdybuddy = await helpers.DB.get('MemberPet', member.birdyBuddy * 1).then((userpet) => {
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
	      var flock = await helpers.DB.get('MemberFlock', member.flock * 1);

		      if (flock && flock.member == member._id) {
	      var flockpets = await helpers.DB.fetch({
		      'kind' : 'MemberPet',
		      'filters' : [
			      ['member', '=', req.params.id],
			      ['flocks', '=', member.flock]
		      ]
	      }).then( (userpets) => {
		      return userpets.map( (userpet) => {
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
      member: member,
      submissions: submissions.length || 0,
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
