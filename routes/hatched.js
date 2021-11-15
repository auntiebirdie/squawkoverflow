const Cache = require('../helpers/cache.js');

const helpers = require('../helpers');
const express = require('express');
const router = express.Router();

router.get('/:adjective', helpers.Middleware.isLoggedIn, async (req, res) => {
  var adjectives = req.session.adjectives;
  delete req.session.adjectives;

  var adjective = req.params.adjective;

  if (adjectives && adjectives.includes(adjective)) {
    var birdypets = [];
    do {
      var bird = helpers.Chance.pickone(helpers.data('eggs')[adjective].species);
      var birdypets = helpers.BirdyPets.findBy('speciesCode', bird).filter((birdypet) => !birdypet.special);
    }
    while (birdypets.length == 0);

    var birdypet = helpers.Chance.pickone(birdypets);

    if (birdypet) {
      var wishlist = await Cache.get('wishlist', req.session.user) || {};
      var userpets = [];

      await helpers.Redis.fetch('memberpet', {
        "FILTER": `@member:{${req.session.user}} @birdypetSpecies:{${birdypet.speciesCode}}`,
        "RETURN": ['birdypetId', 'species']
      }).then((response) => {
        for (var i = 0, len = response.results.length; i < len; i++) {
          userpets.push(response.results[i].birdypetId);
          userpets.push(response.results[i].species);
        }
      });

      res.set('Cache-Control', 'no-store');

      return res.render('hatch/hatched', {
        adjective: adjective,
        birdypet: birdypet,
        userpets: userpets,
        wishlisted: wishlist[birdypet.family] ? wishlist[birdypet.family].includes(birdypet.speciesCode) : false
      });
    } else {
      return res.redirect('/hatch');
    }
  }

  res.redirect('/hatch');
});

module.exports = router;
