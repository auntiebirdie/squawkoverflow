const BirdyPet = require('../models/birdypet.js');

const PubSub = require('../helpers/pubsub.js');

module.exports = (req, res) => {
  return new Promise(async (resolve, reject) => {
    if (!req.body.loggedInUser) {
      resolve(res.status(401).send());
    }

    let birdypet = new BirdyPet();

    await birdypet.create({
      illustration: req.body.illustration,
      member: req.body.loggedInUser
    });

    await PubSub('background', 'COLLECT', {
	    birdypet: birdypet.id,
	    member: req.body.loggedInUser,
	    illustration: req.body.illustration,
	    adjective: req.body.adjective,
	    freebird: req.body.freebird
    });

    if (birdypet.id) {
      resolve(res.json(birdypet));
    } else {
      resolve(res.sendStatus(404));
    }
  }).catch((err) => {
    console.error("uwu crash");
    console.error(err);
  });
};
