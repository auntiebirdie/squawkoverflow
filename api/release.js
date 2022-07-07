const BirdyPet = require('../models/birdypet.js');
const Counters = require('../helpers/counters.js');
const Database = require('../helpers/database.js');
const Member = require('../models/member.js');
const PubSub = require('../helpers/pubsub.js');

module.exports = async (req, res) => {
  if (!req.body.loggedInUser) {
    return res.error(401);
  }

  let member = new Member(req.body.loggedInUser);

  await member.fetch();

  if (req.body.variant) {
    var birdypet = new BirdyPet();

    await birdypet.create({
      variant: req.body.variant,
      addedAt: member.supporter ? new Date(Date.now() - (10 * 60 * 1000)) : new Date(),
      hatchedAt: new Date()
    });

    return res.ok();
  } else if (req.body.birdypet) {
    var birdypet = new BirdyPet(req.body.birdypet);

    await birdypet.fetch();

    if (!birdypet) {
      return res.error(404);
    } else if (birdypet.member != req.body.loggedInUser) {
      return res.error(401);
    }

    await birdypet.delete();

    return res.ok();
  } else {
    return res.error(400);
  }
};
