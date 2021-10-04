const helpers = require('../helpers');
const express = require('express');
const router = express.Router();

router.get('/', helpers.Middleware.isLoggedIn, async (req, res) => {
  res.render('flocks/index', {
    member: await helpers.Redis.get('member', req.session.user.id),
    flocks: await helpers.Redis.fetch({
      "kind": "flock",
      "filters": [
	      { field: "member", value: req.session.user.id }
      ]
    })
  });
});

router.post('/', helpers.Middleware.isLoggedIn, async (req, res) => {
  var existingFlocks = req.body.existingFlocks;
  var existingFlockKeys = await helpers.Redis.fetch({
    "kind": "flock",
    "filters": [
	    { field: "member", value: req.session.user.id }
    ]
  }).then((flocks) => {
    return flocks.map((flock) => {
      return flock._id;
    });
  });

  for (var key of existingFlockKeys) {
    if (existingFlocks[key]) {
      let name = helpers.sanitize(existingFlocks[key]).trim();

      if (name != "") {
        await helpers.Redis.set('flock', key, {
          name: name
        });

        continue;
      }
    }

    await helpers.Redis.delete('flock', key);
  }

  var newFlocks = req.body.newFlocks;

  if (req.body.featuredFlock) {
    try {
      var featuredFlock = req.body.featuredFlock.match(/\[([0-9]+)\]/)[1];

      if (req.body.featuredFlock.includes('existingFlocks')) {
        await helpers.Redis.set('member', req.session.user.id, {
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
      await helpers.Redis.create('flock', {
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

  var allFamilies = require('../public/data/families.json'); 
  var families = new Set();
  var filters = [
	  { field: "member", value: req.entity.member }
  ];

  if (req.session.user && req.session.user.id == req.entity.member) {
    output.member = req.session.user;
    output.flocks = await helpers.Redis.fetch({
      "kind": "flock",
      "filters": [
	      { field: "member", value: req.session.user.id }
      ]
    });
  } else {
    output.member = await helpers.Redis.get("member", req.entity.member);
	  filters.push({
		  field: "flocks",
		  value: req.entity._id
	  });
  }


  output.userpets = await helpers.UserPets.fetch(filters).then((userpets) => {
    return userpets.map((userpet) => {
      families.add(allFamilies.find((a) => a.value == userpet.birdypet.species.family));

      return {
        ...userpet,
        flocks: userpet.flocks.filter((id) => output.flocks.find((flock) => flock._id == id))
      };
    });
  });

  output.families = [...families].sort((a, b) => a.value.localeCompare(b.value))

  res.render('flocks/flock', output);
});

module.exports = router;
