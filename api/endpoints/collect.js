const BirdyPet = require('../models/birdypet.js');
const Member = require('../models/member.js');

const Counters = require('../helpers/counters.js');
const PubSub = require('../helpers/pubsub.js');
const Search = require('../helpers/search.js');

module.exports = (req, res) => {
  return new Promise(async (resolve, reject) => {
    if (!req.body.loggedInUser) {
      resolve(res.status(401).send());
    }

    let birdypet = new BirdyPet();
    let promises = [];

    await birdypet.create({
      illustration: req.body.illustration,
      member: req.body.loggedInUser
    });

    promises.push(PubSub.publish('background', 'COLLECT', {
      birdypet: birdypet.id,
      member: req.body.loggedInUser,
      illustration: req.body.illustration,
      adjective: req.body.adjective,
      freebird: req.body.freebird
    }));

    Promise.all(promises).then(() => {
      if (birdypet.id) {
        resolve(res.json(birdypet));
      } else {
        resolve(res.sendStatus(404));
      }
    });
  }).catch((err) => {
    console.error("uwu crash");
    console.error(err);
  });
};
