const helpers = require('../helpers');
const express = require('express');
const router = express.Router();

router.get('/', helpers.Middleware.isLoggedIn, async (req, res) => {
    res.render('flocks/index', {
      member: await helpers.DB.get('Member', req.session.user.id),
      flocks: await helpers.DB.fetch({
        "kind": "MemberFlock",
        "filters": [
          ["member", "=", req.session.user.id]
        ],
        "order": ["displayOrder"]
      })
    });
});

router.post('/', helpers.Middleware.isLoggedIn, async (req, res) => {
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

    res.redirect('/flocks');
});

router.get('/:id', helpers.Middleware.isLoggedIn, helpers.Middleware.entityExists, helpers.Middleware.userOwnsEntity, async (req, res) => {
  var families = new Set();

  var userpets = await helpers.DB.fetch({
    "kind": "MemberPet",
    "filters": [
      ["member", "=", req.session.user.id]
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
      ["member", "=", req.session.user.id]
    ],
    "order": ["displayOrder"]
  });

  res.render('flocks/flock', {
	  entity: req.entity,
    userpets: userpets,
    flocks: flocks,
    families: [...families].sort((a, b) => a.localeCompare(b))
  });
});

module.exports = router;
