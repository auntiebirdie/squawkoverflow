const helpers = require('../helpers');
const express = require('express');
const router = express.Router();

router.get('/mine', helpers.Middleware.isLoggedIn, (req, res, next) => {
  res.redirect(`/aviary/${req.session.user.id}`);
});

router.get('/:member', helpers.Middleware.entityExists, async (req, res, next) => {
  var allFamilies = require('../public/data/families.json');
  var families = new Set();

  var flocks = await helpers.Redis.fetch('flock', {
    "FILTER": `@member:{${req.entities['member']._id}}`,
    "SORTBY": ["name", "DESC"]
  });

  await helpers.Redis.fetch('memberpet', {
    'FILTER': `@member:{${req.entities['member']._id}}`,
    'RETURN': ['family'],
  }).then((response) => {
    response.forEach((item) => {
      families.add(item.family);
    });
  });

  res.render('aviary/index', {
    page: 'aviary',
    member: req.entities['member'],
    flocks: flocks,
    families: [...families].map((family) => allFamilies.find((a) => a.value == family)).sort((a, b) => a.value.localeCompare(b.value))
  });
});

module.exports = router;
