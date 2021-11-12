const Cache = require('../helpers/cache.js');
const Middleware = require('../helpers/middleware.js');
const Redis = require('../helpers/redis.js');

const express = require('express');
const router = express.Router();

router.get('/mine', Middleware.isLoggedIn, (req, res, next) => {
  res.redirect(`/aviary/${req.session.user.id}`);
});

router.get('/:member', Middleware.entityExists, async (req, res, next) => {
  var allFamilies = require('../public/data/families.json');

  var flocks = await Redis.fetch('flock', {
    "FILTER": `@member:{${req.entities['member']._id}}`,
    "SORTBY": ["displayOrder", "ASC"]
  });

  var aviary = await Cache.get('aviaryTotals', req.entities['member']._id);

  if (aviary) {
  var families = Object.keys(aviary)
		.filter( (key) => aviary[key] > 0 && !key.startsWith('_'))
		.map((family) => allFamilies.find((a) => a.value == family))
		.sort((a, b) => a.value.localeCompare(b.value));
  }
	else {
		families = [];
	}

  res.render('aviary/index', {
    page: 'aviary',
    member: req.entities['member'],
    flocks: flocks.results,
    families: families,
    currentPage : (req.query.page || 1) * 1
  });
});

module.exports = router;
