const helpers = require('../helpers');
const express = require('express');
const router = express.Router();

router.get('/', helpers.Middleware.isLoggedIn, async (req, res) => {
  var flocks = await helpers.Redis.fetch('flock', {
    'FILTER': `@member:{${req.session.user.id}}`,
    'SORTBY': ["displayOrder", "ASC"]
  });

  var displayOrder = 0;

  for (var flock of flocks.results) {
    if (!flock.displayOrder || flock.displayOrder == '0') {
      displayOrder += 100;

      flock.displayOrder = displayOrder;

      await helpers.Redis.set('flock', flock._id, {
        displayOrder: displayOrder
      });
    } else {
      displayOrder = flock.displayOrder;
    }
  }

  res.render('flocks/index', {
    member: await helpers.Redis.get('member', req.session.user.id),
    flocks: flocks.results
  });
});

router.get('/new', helpers.Middleware.isLoggedIn, async (req, res) => {
  res.render('flocks/new');
});

router.post('/new', helpers.Middleware.isLoggedIn, async (req, res) => {
  var name = req.body.name;
  var description = req.body.description;

  if (name.length > 50) {
    name = name.slice(0, 50);
  }

  if (description.length > 500) {
    description = description.slice(0, 500);
  }
  var id = await helpers.Redis.create('flock', {
    name: name,
    description: description,
    member: req.session.user.id,
    displayOrder: 50
  });

  res.redirect(`/flocks/manage/${id}`);
});

router.get('/manage/:flock', helpers.Middleware.isLoggedIn, helpers.Middleware.entityExists, helpers.Middleware.userOwnsEntity, async (req, res) => {
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

  res.render('flocks/manage', {
    page: "flock",
    member: member,
    flock: req.entities['flock'],
    flocks: flocks,
    families: [...families].sort((a, b) => a.value.localeCompare(b.value))
  });
});

router.post('/manage/:flock', helpers.Middleware.isLoggedIn, helpers.Middleware.entityExists, helpers.Middleware.userOwnsEntity, async (req, res) => {
  await helpers.Redis.set('flock', req.entities['flock']._id, {
    name: req.body.name || req.entities['flock'].name,
    description: req.body.description || req.entities['flock'].description
  });

  res.redirect(`/flocks/manage/${req.entities['flock']._id}`);
});

router.get('/:flock', helpers.Middleware.entityExists, async (req, res) => {
  var allFamilies = require('../public/data/families.json');
  var families = new Set();
  var member = await helpers.Redis.get('member', req.entities['flock'].member);

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
    families: [...families].sort((a, b) => a.value.localeCompare(b.value))
  });
});

module.exports = router;
