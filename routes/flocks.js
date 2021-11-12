const Cache = require('../helpers/cache.js');
const Middleware = require('../helpers/middleware.js');
const Redis = require('../helpers/redis.js');

const express = require('express');
const router = express.Router();

router.get('/', Middleware.isLoggedIn, async (req, res) => {
  var flocks = await Redis.fetch('flock', {
    'FILTER': `@member:{${req.session.user.id}}`,
    'SORTBY': ["displayOrder", "ASC"]
  });

  var displayOrder = 0;

  for (var flock of flocks.results) {
    if (!flock.displayOrder || flock.displayOrder == '0') {
      displayOrder += 100;

      flock.displayOrder = displayOrder;

      await Redis.set('flock', flock._id, {
        displayOrder: displayOrder
      });
    } else {
      displayOrder = flock.displayOrder;
    }
  }

  res.render('flocks/index', {
    member: await Redis.get('member', req.session.user.id),
    flocks: flocks.results
  });
});

router.get('/new', Middleware.isLoggedIn, async (req, res) => {
  res.render('flocks/new');
});

router.post('/new', Middleware.isLoggedIn, async (req, res) => {
  var name = req.body.name;
  var description = req.body.description;

  if (name.length > 50) {
    name = name.slice(0, 50);
  }

  if (description.length > 500) {
    description = description.slice(0, 500);
  }
  var id = await Redis.create('flock', {
    name: name,
    description: description,
    member: req.session.user.id,
    displayOrder: 50
  });

  res.redirect(`/flocks/manage/${id}`);
});

router.get('/manage/:flock', Middleware.isLoggedIn, Middleware.entityExists, Middleware.userOwnsEntity, async (req, res) => {
  var allFamilies = require('../public/data/families.json');
  var families = new Set();
  var member = await Redis.get('member', req.entities['flock'].member);

  var flocks = await Redis.fetch('flock', {
    "FILTER": `@member:{${req.session.user.id}}`,
    "SORTBY": ["displayOrder", "ASC"]
  });

  var aviary = await Cache.get('aviaryTotals', req.session.user.id);

  var families = Object.keys(aviary)
                .filter((key) => aviary[key] > 0 && !key.startsWith('_'))
                .map((family) => allFamilies.find((a) => a.value == family))
                .sort((a, b) => a.value.localeCompare(b.value));

  res.render('flocks/manage', {
    page: "flock",
    member: member,
    flock: req.entities['flock'],
    flocks: flocks.results,
    families: families
  });
});

router.post('/manage/:flock', Middleware.isLoggedIn, Middleware.entityExists, Middleware.userOwnsEntity, async (req, res) => {
  await Redis.set('flock', req.entities['flock']._id, {
    name: req.body.name || req.entities['flock'].name,
    description: req.body.description || req.entities['flock'].description
  });

  res.redirect(`/flocks/manage/${req.entities['flock']._id}`);
});

router.get('/:flock', Middleware.entityExists, async (req, res) => {
  var allFamilies = require('../public/data/families.json');
  var families = new Set();
  var member = await Redis.get('member', req.entities['flock'].member);

  await Redis.fetch('memberpet', {
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
