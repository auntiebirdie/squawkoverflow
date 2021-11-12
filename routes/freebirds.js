const BirdyPets = require('../helpers/birdypets.js');
const Cache = require('../helpers/cache.js');
const Middleware = require('../helpers/middleware.js');
const Redis = require('../helpers/redis.js');

const Chance = require('chance').Chance();
const express = require('express');
const router = express.Router();

router.get('/', Middleware.isLoggedIn, async (req, res) => {
  var freebirds = await Redis.get('cache', 'freebirds');
  var wishlist = await Redis.get('wishlist', req.session.user.id);

  if (freebirds.length > 0) {
    freebirds = Chance.pickset(freebirds, 20);

    for (var i = 0, len = freebirds.length; i < len; i++) {
      freebirds[i] = BirdyPets.get(freebirds[i]);
      freebirds[i].wishlisted = wishlist.includes(freebirds[i].species.speciesCode);
      freebirds[i].checkmark = 0;

      await Redis.fetch('memberpet', {
        "FILTER": `@member:{${req.session.user.id}} @birdypetSpecies:{${freebirds[i].species.speciesCode}}`,
        "RETURN": ['birdypetId', 'species']
      }).then((response) => {
        if (response.results.length > 0) {
          freebirds[i].checkmark = response.results.find((result) => result.birdypetId == freebirds[i].id) ? 2 : 1;
        }
      });
    }
  }

  res.render('freebirds/index', {
    birdypets: freebirds
  });
});

module.exports = router;
