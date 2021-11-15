const BirdyPets = require('../../helpers/birdypets.js');
const Members = require('../../helpers/members.js');
const Middleware = require('../../helpers/middleware.js');
const Queue = require('../../helpers/queue.js');
const Redis = require('../../helpers/redis.js');

const express = require('express');
const router = express.Router();

router.post('/', Middleware.isLoggedIn, async (req, res) => {
  var birdypet = BirdyPets.fetch(req.body.birdypetId);

  Redis.create('memberpet', {
    birdypetId: birdypet.id,
    birdypetSpecies: birdypet.speciesCode,
    species: birdypet.species.commonName,
    family: birdypet.species.family,
    member: req.session.user,
    flocks: "NONE",
    hatchedAt: Date.now()
  }).then(async (id) => {
    var member = await Members.get(req.session.user);

    Members.set(req.session.user, { lastHatchedAt: Date.now() });

    await Members.addBirdyPet(req.session.user, birdypet.id);

    if (!member.settings.privacy || !member.settings.privacy?.includes('activity')) {
      Queue.add('egg-hatchery', {
        adjective: req.body.adjective,
        member: req.session.user,
        userpet: id,
        birdypet: birdypet.id
      });
    }

    res.json({
      memberpet: id
    });
  });
});

module.exports = router;
