const helpers = require('../helpers');
const express = require('express');
const router = express.Router();

router.get('/mine', helpers.Middleware.isLoggedIn, (req, res, next) => {
  res.redirect(`/wishlist/${req.session.user.id}`);
});

router.get('/:id', helpers.Middleware.entityExists, async (req, res, next) => {
  var allFamilies = require('../public/data/families.json');

  var families = new Set();

  var userpets = req.session.user.id ? await helpers.UserPets.fetch([{
    field: "member",
    value: req.session.user.id
  }]).then((userpets) => {
    return userpets.map((userpet) => userpet.birdypetId)
  }) : [];

  var wishlist = await helpers.Redis.get('wishlist', req.entity._id).then((wishlist) => {
    return wishlist.map((speciesCode) => {
      var bird = helpers.Birds.fetchBy('speciesCode', speciesCode);

      families.add(allFamilies.find((a) => a.value == bird.family));

      bird.variants = helpers.BirdyPets.findBy('species.speciesCode', speciesCode).map((birdypet) => {
        birdypet.hatched = userpets.includes(birdypet.id);

        return birdypet;
      }).sort(function(a, b) {
      return a.hatched ? -1 : (b.hatched ? 1 : 0);
    });

      return bird;
    });
  });

  res.render('wishlist/index', {
    page: 'wishlist',
    member: req.entity,
    families: [...families].sort((a, b) => a.value.localeCompare(b.value)),
    wishlist: wishlist
  });
});

module.exports = router;
