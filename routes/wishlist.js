const helpers = require('../helpers');
const express = require('express');
const router = express.Router();

router.get('/mine', helpers.Middleware.isLoggedIn, (req, res, next) => {
  res.redirect(`/wishlist/${req.session.user.id}`);
});

router.get('/:member', helpers.Middleware.entityExists, async (req, res, next) => {
  if (req.entities['member']._id != req.session.user?.id && req.entities['member'].settings.privacy?.includes('wishlist')) {
    return res.redirect('/error');
  }

  var allFamilies = require('../public/data/families.json');
  var families = new Set();

  await helpers.Redis.get('wishlist', req.entities['member']._id).then((birds) => {
    birds.forEach((bird) => {
      var family = helpers.Birds.findBy('speciesCode', bird).family;
      families.add(family);
    });
  });

  res.render('wishlist/index', {
    page: 'wishlist',
    member: req.entities['member'],
    families: [...families].map((family) => allFamilies.find((a) => a.value == family)).sort((a, b) => a.value.localeCompare(b.value))
  });
});

module.exports = router;