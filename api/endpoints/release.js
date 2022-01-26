const BirdyPet = require('../models/birdypet.js');
const Counters = require('../helpers/counters.js');
const PubSub = require('../helpers/pubsub.js');

module.exports = async (req, res) => {
  if (!req.body.loggedInUser) {
    return res.sendStatus(401);
  }

  let variant = null;
	let hatchedAt = new Date();

  if (req.body.variant) {
    variant = req.body.variant;
  } else if (req.body.birdypet) {
    let birdypet = new BirdyPet(req.body.birdypet);

    await birdypet.fetch();

    if (!birdypet) {
      return res.sendStatus(404);
    } else if (birdypet.member != req.body.loggedInUser) {
      return res.sendStatus(401);
    }

    variant = birdypet.variant.id;
    hatchedAt = birdypet.hatchedAt;

    await birdypet.delete();
  }

  if (variant) {
    await PubSub.publish('background', 'RELEASE', {
      member: req.body.loggedInUser,
      variant: variant,
      hatchedAt: hatchedAt
    });

    return res.sendStatus(200);
  } else {
    return res.sendStatus(400);
  }
};
