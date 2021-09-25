const helpers = require('../helpers');
const express = require('express');
const router = express.Router();
const Chance = require('chance').Chance();

router.get('/', async (req, res) => {
  res.render('birdypets/index');
});

router.get('/flocks', async (req, res) => {
  if (req.session.user) {
    res.render('birdypets/flocks', {
      member: await helpers.DB.get('Member', req.session.user.id),
      flocks: await helpers.DB.fetch({
        "kind": "MemberFlock",
        "filters": [
          ["member", "=", req.session.user.id]
        ],
        "order": ["displayOrder"]
      })
    });
  } else {
    res.redirect('/');
  }
});

router.post('/flocks', async (req, res) => {
  if (req.session.user) {
    var existingFlocks = req.body.existingFlocks;
    var existingFlockKeys = await helpers.DB.fetch({
      "kind": "MemberFlock",
      "filters": [
        ["member", "=", req.session.user.id]
      ],
      "keysOnly": true
    }).then((flocks) => {
      return flocks.map((flock) => {
        return flock._id;
      });
    });

    for (var key of existingFlockKeys) {
      if (existingFlocks[key]) {
        let name = helpers.sanitize(existingFlocks[key]).trim();

        if (name != "") {
          await helpers.DB.set('MemberFlock', key * 1, {
            name: name
          });

          continue;
        }
      }

      await helpers.DB.delete('MemberFlock', key * 1);
    }

    var newFlocks = req.body.newFlocks;

    if (req.body.featuredFlock) {
      try {
        var featuredFlock = req.body.featuredFlock.match(/\[([0-9]+)\]/)[1];

        if (req.body.featuredFlock.includes('existingFlocks')) {
          await helpers.DB.set('Member', req.session.user.id, {
            "flock": featuredFlock
          });
        }
      } catch (err) {}
    }

    for (var i = 0, len = newFlocks.length; i < len; i++) {
      let name = helpers.sanitize(newFlocks[i]).trim();

      if (name != "") {
        await helpers.DB.create('MemberFlock', {
          member: req.session.user.id,
          name: name,
          displayOrder: 0
        });
      }
    }

    res.redirect('/birdypets/flocks');
  } else {
    res.redirect('/');
  }
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
    var families = new Set();

    var userpets = await helpers.DB.fetch({
      "kind": "MemberPet",
      "filters": [
        ["member", "=", member._id]
      ],
      "order": ["hatchedAt", {
        "descending": true
      }]
    }).then((userpets) => {
      return userpets.map((userpet) => {
        let birdypet = helpers.BirdyPets.fetch(userpet.birdypet);

        families.add(birdypet.species.family);

        return {
          id: userpet._id,
          nickname: userpet.nickname,
          hatchedAt: userpet.hatchedAt,
          flocks: userpet.flocks || [],
          birdypet: birdypet
        }
      });
    });

    var flocks = await helpers.DB.fetch({
      "kind": "MemberFlock",
      "filters": [
        ["member", "=", member._id]
      ],
      "order": ["displayOrder"]
    });

    res.render('birdypets/aviary', {
      member: member,
      userpets: userpets,
      flocks: flocks,
      families: [...families].sort((a, b) => a.localeCompare(b))
    });
  } else {
    res.redirect('/error');
  }
});

router.get('/buddy/:id', async (req, res) => {
  try {
    helpers.DB.get('MemberPet', req.params.id * 1).then((userpet) => {
      if (userpet.member != req.session.user.id) {
        throw "this isn't yours!";
      }

      helpers.DB.set('Member', userpet.member, {
        'birdyBuddy': userpet._id
      }).then(() => {
        res.redirect(`/birdypets/${userpet._id}`);
      });
    });
  } catch (err) {
    res.redirect('/error');
  }
});

router.get('/gift/:id', async (req, res) => {
  try {
    await helpers.DB.get('MemberPet', req.params.id * 1).then(async (userpet) => {
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
          "cacheId": "members"
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

        helpers.DB.set('MemberPet', userpet._id * 1, {
          "member": member._id,
          "friendship": 0
        }).then(() => {

          var birdypet = helpers.BirdyPets.fetch(userpet.birdypet);

          helpers.Discord.Webhook.send('exchange', {
            content: `<@${req.session.user.id}> has sent <@${req.body.member}> a gift!`,
            embeds: [{
              "Title": userpet.nickname ? userpet.nickname : birdypet.species.commonName,
              "URL": `https://squawkoverflow.com/birdypets/${userpet._id}`,
              "Image": birdypet.illustration
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

router.get('/release/:id', (req, res) => {
  try {
    helpers.DB.get('MemberPet', req.params.id * 1).then(async (userpet) => {
      if (userpet.member != req.session.user.id) {
        throw "this isn't yours!";
      }

      res.render('birdypets/release', {
        userpet: userpet,
        birdypet: helpers.BirdyPets.fetch(userpet.birdypet)
      });
    });
  } catch (err) {
    res.redirect('/error');
  }
});

router.post('/release/:id', (req, res) => {
  try {
    helpers.DB.get('MemberPet', req.params.id * 1).then(async (userpet) => {
      if (userpet.member != req.session.user.id) {
        throw "this isn't yours!";
      }

      var birdypet = helpers.BirdyPets.fetch(userpet.birdypet);

      helpers.Discord.Webhook.send('free-birds', {
        content: Chance.pickone(require('../data/webhooks.json').release),
        embeds: [{
          "Title": birdypet.species.commonName,
          "Image": birdypet.illustration
        }],
        components: [{
          type: 2,
          label: "Add to Aviary!",
          style: 1,
          customId: `birdypets_catch-${birdypet.id}`
        }]
      });
      await helpers.DB.delete('MemberPet', req.params.id * 1);

      res.redirect('/birdypets/aviary/' + req.session.user.id);
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
  try {
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
          userpet: userpet,
          birdypet: birdypet,
          member: member,
          flocks: await helpers.DB.fetch({
            "kind": "MemberFlock",
            "filters": [
              ["member", "=", member._id]
            ],
            "order": ["displayOrder", {}]
          }),
          otherVersions: require('../public/data/birdypets.json').filter((version) => version.species.speciesCode == birdypet.species.speciesCode)
        });
      } else {
        res.redirect('/error');
      }
    });
  } catch (err) {
    res.redirect('/error');
  }
});

router.post('/:id', async (req, res) => {
  try {
    var userpet = await helpers.DB.get('MemberPet', req.params.id * 1, true).then(async (userpet) => {
      if (userpet) {
        var nickname = req.body.nickname;

        if (nickname.length > 32) {
          nickname = nickname.slice(0, 32);
        }

        nickname = helpers.sanitize(nickname);

        var variant = req.body.variant || userpet.birdypet;

        await helpers.DB.set('MemberPet', req.params.id * 1, {
          nickname: nickname,
          birdypet: variant,
          flocks: req.body.flocks
        });

        res.redirect('/birdypets/' + req.params.id);
      } else {
        res.json({
          error: "BirdyPet not found."
        });
      }
    });
  } catch (err) {
    res.redirect('/error');
  };
});

module.exports = router;
