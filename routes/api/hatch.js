const BirdyPets = require('../../helpers/birdypets.js');
const Members = require('../../helpers/members.js');
const Middleware = require('../../helpers/middleware.js');
const Redis = require('../../helpers/redis.js');
const Webhook = require('../../helpers/webhook.js');

const express = require('express');
const router = express.Router();

router.post('/', Middleware.isLoggedIn, async (req, res) => {
  var birdypet = BirdyPets.fetch(req.body.birdypetId);

  Redis.create('memberpet', {
    birdypetId: birdypet.id,
    birdypetSpecies: birdypet.speciesCode,
    species: birdypet.species.commonName,
    family: birdypet.species.family,
    member: req.session.user.id,
    flocks: "NONE",
    hatchedAt: Date.now()
  }).then(async (id) => {
    var member = await Members.get(req.session.user.id);

    Redis.set('member', req.session.user.id, { lastHatchedAt: Date.now() });

    Members.addBirdyPet(req.session.user.id, birdypet.id);

    if (!member.settings.privacy && !member.settings.privacy?.includes('activity')) {
      Webhook.send('egg-hatchery', {
        adjective: req.body.adjective,
        member: req.session.user.id,
        userpet: id,
        birdypet: birdypet
      });
    }

    res.json({
      memberpet: id
    });
  });
});

module.exports = router;
