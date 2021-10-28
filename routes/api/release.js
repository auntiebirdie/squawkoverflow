const BirdyPets = require('../../helpers/birdypets.js');
const Middleware = require('../../helpers/middleware.js');
const Redis = require('../../helpers/redis.js');

const express = require('express');
const router = express.Router();

router.post('/', Middleware.isLoggedIn, async (req, res) => {
  var birdypet = BirdyPets.fetch(req.body.birdypetId);

  if (birdypet) {
	  await Redis.push('cache', 'freebirds', birdypet.id);
  }

  res.json("ok");
});

module.exports = router;
