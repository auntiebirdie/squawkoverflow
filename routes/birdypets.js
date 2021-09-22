const helpers = require('../helpers');
const express = require('express');
const router = express.Router();

router.get('/', async (req, res) => {
  res.render('birdypets/index');
});

router.get('/mine', async (req, res) => {
  if (req.session.user) {
    res.redirect(`/birdypets/aviary/${req.session.user.id}`);
  } else {
    res.redirect('/');
  }
});

router.get('/aviary/:id', async (req, res) => {
  var member = await helpers.DB.get('Member', req.params.id);

  if (member) {
    member.userpets = await helpers.DB.fetch({
      "kind": "MemberPet",
      "filters": [
        ["member", "=", member._id]
      ],
      "order": ["hatchedAt", {
        "descending": true
      }]
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

    res.render('birdypets/aviary', {
      member: member
    });
  } else {
    res.redirect('/error');
  }
});

router.get('/gift/:id', async (req, res) => {
  try {
    var gift = await helpers.DB.get('MemberPet', req.params.id * 1).then(async (userpet) => {
      if (userpet.member != req.session.user.id) {
        throw "this isn't yours!";
      }

      res.render('birdypets/gift', {
        giftpet: {
          id: userpet._id,
          nickname: userpet.nickname,
          birdypet: helpers.BirdyPets.fetch(userpet.birdypet)
        },
        members: await helpers.DB.fetch({
          "kind": "Member",
		"cacheId" : "members"
        })
      });
    });
  } catch (err) {
    res.redirect('/error');
  }
});

router.post('/gift/:id', (req, res) => {
  try {
    helpers.DB.get('MemberPet', req.params.id * 1).then(async (userpet) => {
      if (userpet.member != req.session.user.id) {
        throw "this isn't yours!";
      }

      if (!req.body.member) {
        throw "you gotta gift it to someone!";
      }

      helpers.DB.get('Member', req.body.member).then((member) => {
        if (!member) {
          throw "that isn't a registered member!";
        }

	      helpers.DB.set('MemberPet', userpet._id, { "member" : member._id }).then( () => {

          var birdypet = helpers.BirdyPets.fetch(userpet.birdypet);

          helpers.Discord.Webhook.send({
            content: `<@${req.session.user.id}> has sent <@${req.body.member}> a gift!`,
            embeds: [{
		    "Title" : userpet.nickname ? userpet.nickname : birdypet.species.commonName,
		    "URL" : `https://squawkoverflow.com/birdypets/${userpet._id}`,
		    "Image" : birdypet.illustration
	    }]
          });

          res.redirect('/birdypets/' + req.params.id);
        });
      });
    });
  } catch (err) {
    res.redirect('/error');
  }
});

router.get('/trade/:id', async (req, res) => {
  try {
    var tradeFor = await helpers.DB.get('MemberPet', req.params.id * 1).then(async (userpet) => {
      return {
        id: userpet._id,
        nickname: userpet.nickname,
        birdypet: helpers.BirdyPets.fetch(userpet.birdypet),
        member: await helpers.DB.get('Member', userpet.member).then((member) => {
          if (member) {
            return {
              id: member._id,
              username: member.username,
              avatar: member.avatar
            }
          } else {
            return {
              id: userpet.member,
              username: `Unregistered User ${userpet.member}`,
              avatar: null
            }
          }
        })
      }
    });

    var userpets = await helpers.DB.fetch({
      "kind": "MemberPet",
      "filters": [
        ["member", "=", req.session.user.id]
      ]
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

    res.render('birdypets/trade', {
      tradeFor: tradeFor,
      userpets: userpets
    });
  } catch (err) {
    res.redirect('/error');
  }
});

router.get('/:id', async (req, res) => {
  var userpet = await helpers.DB.get('MemberPet', req.params.id * 1).then(async (userpet) => {
    if (userpet) {
        var birdypet = helpers.BirdyPets.fetch(userpet.birdypet);

        var member = await helpers.DB.get('Member', userpet.member);

	    if (!member) {
		    member = {
			    _id: userpet.member,
			    username: "Unregistered"
		    }
	    }

      res.render('birdypets/view', {
	      userpet: { ...userpet, ...{ member: member, birdypet: birdypet }}
      });
    } else {
      res.redirect('/error');
    }
  });
});

router.post('/:id', async (req, res) => {
  var userpet = await helpers.DB.get('MemberPet', req.params.id * 1, true).then(async (userpet) => {
    if (userpet) {
      var nickname = req.body.nickname;

      if (nickname.length > 32) {
        nickname = nickname.slice(0, 32);
      }

      nickname = nickname.replace(/[&<>'"]/g,
        tag => ({
          '&': '&amp;',
          '<': '&lt;',
          '>': '&gt;',
          "'": '&#39;',
          '"': '&quot;'
        } [tag]));

      await helpers.DB.set('MemberPet', req.params.id * 1, { nickname : nickname });

      res.redirect('/birdypets/' + req.params.id);
    } else {
      res.json({
        error: "BirdyPet not found."
      });
    }
  });
});

module.exports = router;
