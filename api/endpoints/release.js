const BirdyPet = require('../models/birdypet.js');
const Counters = require('../helpers/counters.js');
const Database = require('../helpers/database.js');
const Member = require('../models/member.js');
const PubSub = require('../helpers/pubsub.js');

module.exports = async (req, res) => {
  if (!req.body.loggedInUser) {
    return res.sendStatus(401);
  }

  let variant = null;
  let member = new Member(req.body.loggedInUser);

  await member.fetch();

  if (req.body.variant) {
    variant = req.body.variant;

    if (req.body.variant == "iqkTUrXqtN31qnXTtJaVH5") {
      promises.push(Database.query('INSERT INTO counters VALUES (?, "aprfools", ?, 1) ON DUPLICATE KEY UPDATE `count` = `count` + 1', [req.body.loggedInUser, new Date().getYear()]));
    }

    var birdypet = new BirdyPet();

    await birdypet.create({
      variant: variant,
      addedAt: member.tier.eggTimer ? new Date() : new Date(Date.now() - (10 * 60 * 1000)),
      hatchedAt: new Date()
    });

    return res.sendStatus(200);
  } else if (req.body.birdypet) {
    var birdypet = new BirdyPet(req.body.birdypet);

    await birdypet.fetch();

    if (!birdypet) {
      return res.sendStatus(404);
    } else if (birdypet.member != req.body.loggedInUser) {
      return res.sendStatus(401);
    }

    await birdypet.delete();

    return res.sendStatus(200);
  } else {
    return res.sendStatus(400);
  }
};
