const {
  PubSub
} = require('@google-cloud/pubsub');

const pubSubClient = new PubSub();

const BirdyPets = require('../collections/birdypets.js');
const Member = require('../models/member.js');
const Cache = require('../helpers/cache.js');

module.exports = async (req, res) => {
  if (!req.body?.loggedInUser && !req.query?.loggedInUser) {
    return res.sendStatus(401);
  }

  switch (req.method) {
    case "GET":
      let member = new Member(req.query.loggedInUser);

      await member.fetch();
/*
      if (member.tier.eggTimer && member.lastHatchedAt) {
        let timeSinceLastHatch = (Date.now() - member.lastHatchedAt) / 60000;

        if (timeSinceLastHatch < member.tier.eggTimer) {
          let timeUntil = Math.floor(member.tier.eggTimer - timeSinceLastHatch);

          return res.status(403).json({
            timeUntil
          });
        }
      }
      */

      var eggs = require('../data/eggs.json');
      var keys = Object.keys(eggs).sort(() => .5 - Math.random()).slice(0, 6);

      eggs = await Promise.all(keys.map(async (egg) => {
        let cached = member.tier?.extraInsights ? await Cache.get(`eggs-${egg}`, member.id, "s") : [];

        return {
          ...eggs[egg],
          name: egg,
          totals: [(cached.length || 0), eggs[egg].species.length]
        }
      }));

      return res.status(200).json(eggs);
      break;
    case "POST":
      var birdypets = [];
      var species = require('../data/eggs.json')[req.body.egg].species;

      do {
        var bird = species.sort(() => .5 - Math.random())[0];
        var birdypets = BirdyPets.findBy('speciesCode', bird).filter((birdypet) => !birdypet.special);
      }
      while (birdypets.length == 0);

      var birdypet = birdypets.sort(() => .5 - Math.random())[0];

      if (birdypet) {
        await birdypet.fetchMemberData(req.body.loggedInUser);

        return res.status(200).json(birdypet);
      } else {
        return res.sendStatus(500);
      }
      break;
    default:
      return res.sendStatus(405);
  }
};
