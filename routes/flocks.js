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
    } catch (err) {
      console.log(err);
    }
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

router.get('/:id', helpers.Middleware.entityExists, async (req, res) => {
  var output = {
    page: "flock",
    entity: req.entity,
    flocks: []
  };

  var families = new Set();

  if (req.session.user && req.session.user.id == req.entity.member) {
    output.member = req.session.user;
    output.flocks = await helpers.DB.fetch({
      "kind": "MemberFlock",
      "filters": [
        ["member", "=", req.session.user.id]
      ],
      "order": ["displayOrder"]
    });
  } else {
    output.member = await helpers.DB.get("Member", req.entity.member);
  }

  output.userpets = await helpers.DB.fetch({
    "kind": "MemberPet",
    "filters": [
	    ["member", "=", req.entity.member]
    ]
  }).then((userpets) => {
    return userpets.filter( (userpet) => {
	    if (req.session.user && req.session.user.id == req.entity.member) {
		    return true;
	    } else {
		    return userpet.flocks && (userpet.flocks.includes(req.entity._id) || userpet.flocks.includes(`${req.entity._id}`));
	    }
    }).map((userpet) => {
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

  output.families = [...families].sort((a, b) => a.localeCompare(b));

  res.render('flocks/flock', output);
});

module.exports = router;
