const Cache = require('../helpers/cache.js');
const Middleware = require('../helpers/middleware.js');

const helpers = require('../helpers');
const express = require('express');
const router = express.Router();

router.get('/mine', Middleware.isLoggedIn, (req, res, next) => {
  res.redirect(`/wishlist/${req.session.user}`);
});

router.get('/:member', Middleware.entityExists, async (req, res, next) => {
  if (req.entities['member']._id != req.session.user?.id && req.entities['member'].settings.privacy?.includes('wishlist')) {
    return res.redirect('/error');
  }

  var allFamilies = require('../public/data/families.json');
  var families = [];

  await Cache.get('wishlist', req.entities['member']._id).then((response) => {
      families = Object.keys(response);
  });

  res.render('wishlist/index', {
    page: 'wishlist',
    member: req.entities['member'],
    families: [...families].map((family) => allFamilies.find((a) => a.value == family)).filter((family) => family != null).sort((a, b) => a.value.localeCompare(b.value)),
    currentPage : (req.query.page || 1) * 1
  });
});

module.exports = router;
