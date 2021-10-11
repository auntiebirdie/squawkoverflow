const helpers = require('../helpers');
const express = require('express');
const router = express.Router();

router.get('/mine', helpers.Middleware.isLoggedIn, (req, res, next) => {
  res.redirect(`/wishlist/${req.session.user.id}`);
});

router.get('/:member', helpers.Middleware.entityExists, async (req, res, next) => {
  var allFamilies = require('../public/data/families.json');
  var families = new Set();

  res.render('wishlist/index', {
    page: 'wishlist',
    member: req.entities['member'],
    families: [...families].sort((a, b) => a.value.localeCompare(b.value))
  });
});

module.exports = router;
