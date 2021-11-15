const BirdyPets = require('../../helpers/birdypets.js');
const Middleware = require('../../helpers/middleware.js');
const Queue = require('../../helpers/queue.js');

const express = require('express');
const router = express.Router();

router.post('/', Middleware.isLoggedIn, async (req, res) => {
  var birdypet = BirdyPets.fetch(req.body.birdypetId);

  if (birdypet) {
    await Queue.add('free-birds', {
      member: req.session.user,
      birdypet: birdypet.id
    });
  }

  res.json("ok");
});

module.exports = router;