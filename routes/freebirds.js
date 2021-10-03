const helpers = require('../helpers');
const express = require('express');
const router = express.Router();

router.get('/', helpers.Middleware.isLoggedIn, async (req, res) => {
  var freebirds = await helpers.Redis.fetch({
    "kind": "freebird",
    "startAt": helpers.Chance.integer({
      min: 0,
      max: 50
    }),
    "maxResults": 20
  });

  if (freebirds.length == 0) {
    freebirds = await helpers.Redis.fetch({
      "kind": "freebird",
      "maxResults": 20
    });
  }

  res.render('freebirds/index', {
    birdypets: freebirds.map((freebird) => {
      return helpers.BirdyPets.fetch(freebird._id);
    })
  });
});

module.exports = router;
