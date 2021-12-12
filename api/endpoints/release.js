const BirdyPet = require('../models/birdypet.js');
const PubSub = require('../helpers/pubsub.js');

module.exports = async (req, res) => {
  if (!req.body.loggedInUser) {
    return res.sendStatus(401);
  }

  let illustration = null;

  if (req.body.illustration) {
    illustration = req.body.illustration;
  } else if (req.body.birdypet) {
    let birdypet = new BirdyPet(req.body.birdypet);

    await birdypet.fetch();

    if (!birdypet) {
      return res.sendStatus(404);
    } else if (birdypet.member != req.body.loggedInUser) {
      return res.sendStatus(401);
    }

    illustration = birdypet.illustration.id;

    await birdypet.delete();
  }

  if (illustration) {
    PubSub.publish('background', 'RELEASE', {
	    member: req.body.loggedInUser,
	    birdypet: req.body.birdypet,
	    illustration: illustration
    });

    return res.sendStatus(200);
  } else {
    return res.sendStatus(400);
  }
};
