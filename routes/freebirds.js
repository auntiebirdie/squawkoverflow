const BirdyPets = require('../helpers/birdypets.js');
const Cache = require('../helpers/cache.js');
const Middleware = require('../helpers/middleware.js');
const Redis = require('../helpers/redis.js');

const Chance = require('chance').Chance();
const express = require('express');
const router = express.Router();

router.get('/', Middleware.isLoggedIn, async (req, res) => {
  var freebirds = await Redis.get('cache', 'freebirds');
  var wishlist = await Cache.get('wishlist', req.session.user);

  if (freebirds.length > 0) {
    freebirds = Chance.pickset(freebirds, 20);

    for (var i = 0, len = freebirds.length; i < len; i++) {
	    let ackId = freebirds[i];
      let birdypet = BirdyPets.get(freebirds[i]);

      if (!birdypet) {
        birdypet = await new Promise((resolve, reject) => {
          Redis.databases['cache'].get(`freebird:${freebirds[i]}`, (err, result) => {
            resolve(BirdyPets.get(result));
          });
        });
      }

      if (birdypet) {
        freebirds[i] = birdypet;
        freebirds[i].ackId = ackId;
        freebirds[i].wishlisted = wishlist[freebirds[i].species.family] ? wishlist[freebirds[i].species.family].includes(freebirds[i].species.speciesCode) : false;
        freebirds[i].checkmark = 0;

        await Redis.fetch('memberpet', {
          "FILTER": `@member:{${req.session.user}} @birdypetSpecies:{${freebirds[i].species.speciesCode}}`,
          "RETURN": ['birdypetId', 'species']
        }).then((response) => {
          if (response.results.length > 0) {
            freebirds[i].checkmark = response.results.find((result) => result.birdypetId == freebirds[i].id) ? 2 : 1;
          }
        });
      } else {
        freebirds[i] = null;
      }
    }
  }

  res.render('freebirds/index', {
    birdypets: freebirds.filter((freebird) => freebird != null)
  });
});

module.exports = router;
