const helpers = require('../helpers');
const express = require('express');
const router = express.Router();

router.get('/mine', helpers.Middleware.isLoggedIn, (req, res, next) => {
  res.redirect(`/aviary/${req.session.user.id}`);
});

router.get('/:id', helpers.Middleware.entityExists, async (req, res, next) => {
  var allFamilies = require('../public/data/families.json');
  var families = new Set();

  var flocks = await helpers.Redis.fetch('flock', {
	  "FILTER": `@member:{${req.entity._id}}`,
	  "SORTBY": ["name", "DESC"]
  });

  await helpers.Redis.fetch('memberpet', {
	  'FILTER': `@member:{${req.entity._id}}`,
	  'RETURN': ['family'],
  }).then( (response) => {
    response.forEach((item) => {
      families.add(allFamilies.find((a) => a.value == item.family));
    });
  });

  res.render('aviary/index', {
    page: 'aviary',
    member: req.entity,
    flocks: flocks,
    families: [...families].sort((a, b) => a.value.localeCompare(b.value))
  });
});

module.exports = router;
