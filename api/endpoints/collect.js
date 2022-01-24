const BirdyPet = require('../models/birdypet.js');

const Counters = require('../helpers/counters.js');
const Database = require('../helpers/database.js');
const PubSub = require('../helpers/pubsub.js');

module.exports = (req, res) => {
  return new Promise(async (resolve, reject) => {
    if (!req.body.loggedInUser) {
      resolve(res.status(401).send());
    }

    let birdypet = new BirdyPet();
    let promises = [];
    let variant = req.body.variant;

    if (req.body.freebird) {
      variant = await Database.getOne('freebirds', {
        id: req.body.freebird
      }).then((result) => result.variant);
      promises.push(Database.delete('freebirds', {
        id: req.body.freebird
      }));
    } else {
      promises.push(Database.query('UPDATE members SET lastHatchAt = NOW() WHERE id = ?', [req.body.loggedInUser]));
    }

    await birdypet.create({
      variant: variant,
      member: req.body.loggedInUser
    });

    promises.push(PubSub.publish('background', 'COLLECT', {
      birdypet: birdypet.id,
      member: req.body.loggedInUser,
      variant: variant,
      adjective: req.body.adjective,
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