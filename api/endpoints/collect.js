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
      variant: req.body.variant,
      member: req.body.loggedInUser
    });

    promises.push(Counters.increment(1, 'birdypets', req.body.loggedInUser, req.body.variant));

    promises.push(PubSub.publish('background', 'COLLECT', {
      birdypet: birdypet.id,
      member: req.body.loggedInUser,
      variant: req.body.variant,
      adjective: req.body.adjective,
      freebird: req.body.freebird,
      source: req.headers && req.headers['x-forwarded-for'] == '35.208.110.100' ? 'DISCORD' : 'WEB'
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
