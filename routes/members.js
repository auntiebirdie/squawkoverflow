const helpers = require('../helpers');
const express = require('express');
const router = express.Router();

router.get('/', async (req, res) => {
  var members = await helpers.DB.fetch({
	  "cacheId" : "members",
    "kind": "Member"
  });

    res.render('members/index', {
      members: members
    });
});

router.get('/:id', async (req, res) => {
  var member = await helpers.DB.get('Member', req.params.id);

  if (member) {
    var userpets = await helpers.DB.fetch({
      "kind": "MemberPet",
      "filters": [
        ["member", "=", member._id]
      ],
      "order": ["hatchedAt", {
        "descending": true
      }],
      "limit": 4
    }).then((userpets) => {
      return userpets.map((userpet) => {
        return {
          id: userpet._id,
          nickname: userpet.nickname,
          hatchedAt: userpet.hatchedAt,
          birdypet: helpers.BirdyPets.fetch(userpet.birdypet)
        }
      });
    });

    res.render('members/member', {
      member: member,
	    userpets: userpets
    });
  } else {
    console.error(`ERROR - member ${req.params.id} not found`);
    res.redirect('/error');
  }
});

module.exports = router;
