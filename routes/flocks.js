const helpers = require('../helpers');
const express = require('express');
const router = express.Router();

router.get('/', helpers.Middleware.isLoggedIn, async (req, res) => {
  res.render('flocks/index', {
    member: await helpers.Redis.get('member', req.session.user.id),
    flocks: await helpers.Redis.fetch('flock', {
      'FILTER': `@member:{${req.session.user.id}}`
    })
  });
});

router.post('/', helpers.Middleware.isLoggedIn, async (req, res) => {
  var existingFlocks = req.body.existingFlocks || {};
  var existingFlockKeys = await helpers.Redis.fetch('flock', {
    'FILTER': `@member:{${req.session.user.id}}`,
    'KEYSONLY': true
  });

  for (var key of existingFlockKeys) {
    if (existingFlocks[key._id]) {
      let name = helpers.sanitize(existingFlocks[key._id]).trim();

      if (name != "") {
        await helpers.Redis.set('flock', key._id, {
          name: name
        });
      }

      continue;
    }

    await helpers.Redis.delete('flock', key._id);
  }

  var newFlocks = req.body.newFlocks;

  if (req.body.featuredFlock) {
    try {
      await helpers.Redis.set('member', req.session.user.id, {
        "flock": req.body.featuredFlock
      });
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

router.get('/:flock', helpers.Middleware.entityExists, async (req, res) => {
  var allFamilies = require('../public/data/families.json');
  var families = new Set();
  var member = await helpers.Redis.get('member', req.entities['flock'].member);

  var flocks = await helpers.Redis.fetch('flock', {
    "FILTER": `@member:{${req.entities['flock'].member}}`,
    "SORTBY": ["name", "DESC"]
  });

  await helpers.Redis.fetch('memberpet', {
    'FILTER': `@member:{${req.entities['flock'].member}}`,
    'RETURN': ['family'],
  }).then((response) => {
    response.forEach((item) => {
      var family = allFamilies.find((a) => a.value == item.family);

      if (family) {
        families.add(family);
      }
    });
  });

  res.render('flocks/flock', {
    page: 'flock',
    member: member,
    flock: req.entities['flock'],
    flocks: flocks,
    families: [...families].sort((a, b) => a.value.localeCompare(b.value))
  });
});

module.exports = router;
