const BirdyPets = require('../../helpers/birdypets.js');
const Cache = require('../../helpers/cache.js');
const Members = require('../../helpers/members.js');
const Middleware = require('../../helpers/middleware.js');
const Redis = require('../../helpers/redis.js');

const {
  v1
} = require('@google-cloud/pubsub');

const subClient = new v1.SubscriberClient();

const express = require('express');
const router = express.Router();

router.post('/:birdypet', Middleware.isLoggedIn, async (req, res) => {
  var birdypet = BirdyPets.get(req.params.birdypet);
  let ackId = null;

  if (!birdypet) {
    let ackId = req.params.birdypet;

    birdypet = await new Promise((resolve, reject) => {
      Redis.databases['cache'].get(`freebird:${ackId}`, (err, result) => {
        resolve(BirdyPets.get(result));
      });
    });
  }

  var freebirds = await Redis.get('cache', 'freebirds');

  if (birdypet && freebirds.includes(req.params.birdypet)) {
    if (ackId) {
      Redis.databases['cache'].del(`freebird:${ackId}`);
      await Redis.pop('cache', 'freebirds', ackId);

      const formattedSubscription = subClient.subscriptionPath(
        process.env.GCP_PROJECT,
        'squawkoverflow-free-birds'
      );

      const ackRequest = {
        subscription: formattedSubscription,
        ackIds: [ackId]
      };

      await subClient.acknowledge(ackRequest);

    } else {
      await Redis.pop('cache', 'freebirds', birdypet.id);
    }

    Redis.create('memberpet', {
      birdypetId: birdypet.id,
      birdypetSpecies: birdypet.speciesCode,
      species: birdypet.species.commonName,
      family: birdypet.species.family,
      member: req.session.user,
      flocks: "NONE",
      hatchedAt: Date.now()
    }).then(async (id) => {
      await Members.addBirdyPet(req.session.user, birdypet.id);

      res.json({
        response: `<a href="/birdypet/${id}">${birdypet.species.commonName}</a>`
      });
    });
  } else {
    res.json({
      error: "That bird has already found a home!"
    });
  }
});

module.exports = router;
