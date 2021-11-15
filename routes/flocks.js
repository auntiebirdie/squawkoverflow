const Cache = require('../helpers/cache.js');
const Middleware = require('../helpers/middleware.js');
const Redis = require('../helpers/redis.js');

const express = require('express');
const router = express.Router();

router.get('/', Middleware.isLoggedIn, async (req, res) => {
  var flocks = await Redis.fetch('flock', {
    'FILTER': `@member:{${req.session.user}}`,
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
    member: await Redis.get('member', req.session.user),
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
    member: req.session.user,
    displayOrder: 50
  });

  res.redirect(`/flocks/manage/${id}`);
});

router.get('/manage/:flock', Middleware.isLoggedIn, Middleware.entityExists, Middleware.userOwnsEntity, async (req, res) => {
  var allFamilies = require('../public/data/families.json');
  var families = [];
  var member = await Redis.get('member', req.entities['flock'].member);

  var flocks = await Redis.fetch('flock', {
    "FILTER": `@member:{${req.session.user}}`,
    "SORTBY": ["displayOrder", "ASC"]
  });

  var aviary = await Cache.get('aviaryTotals', req.session.user);

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
  var families = [];
  var member = await Redis.get('member', req.entities['flock'].member);

  var totals = await Cache.get('flockTotals', req.entities['flock']._id);

  var families = Object.keys(totals)
                .filter((key) => totals[key] > 0 && !key.startsWith('_'))
                .map((family) => allFamilies.find((a) => a.value == family))
                .sort((a, b) => a.value.localeCompare(b.value));

  res.render('flocks/flock', {
    page: 'flock',
    member: member,
    flock: req.entities['flock'],
    families: families
  });
});

module.exports = router;
