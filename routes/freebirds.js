const helpers = require('../helpers');
const express = require('express');
const router = express.Router();

router.get('/', helpers.Middleware.isLoggedIn, async (req, res) => {
  var freebirds = await helpers.Redis.scan('freebird', {
    'CURSOR': helpers.Chance.integer({
      min: 0,
      max: 2000
    }),
    'LIMIT': 20
  });

  if (freebirds.length == 0) {
    freebirds = await helpers.Redis.scan('freebird', {
      'LIMIT': 20
    });
  }

  for (var i = 0, len = freebirds.length; i < len; i++) {
    freebirds[i] = helpers.BirdyPets.fetch(freebirds[i]._id);

    await helpers.Redis.fetch('memberpet', {
      "FILTER": `@member:{${req.session.user.id}} @birdypetSpecies:{${freebirds[i].speciesCode}}`,
      "RETURN": ['birdypetId', 'species']
    }).then((results) => {
      if (results.length > 0) {
        freebirds[i].checkmark = results.find((result) => result.birdypetId == freebirds[i]._id) ? 2 : 1;
      }
    });
  }

  res.render('freebirds/index', {
    birdypets: freebirds
  });
});

module.exports = router;
