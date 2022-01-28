const BirdyPet = require('../models/birdypet.js');
const Member = require('../models/member.js');

const Counters = require('../helpers/counters.js');
const Database = require('../helpers/database.js');
const PubSub = require('../helpers/pubsub.js');

module.exports = (req, res) => {
  return new Promise(async (resolve, reject) => {
    if (!req.body.loggedInUser) {
      resolve(res.status(401).send());
    }

    let member = new Member(req.body.loggedInUser);
    let birdypet = new BirdyPet();
    let promises = [];
    let variant = req.body.variant;

    if (req.body.freebird) {
      promises.push(Database.delete('freebirds', {
        id: req.body.freebird
      }));
    } else {
      promises.push(Database.query('UPDATE members SET lastHatchAt = NOW() WHERE id = ?', [req.body.loggedInUser]));
    }

    await member.fetch({
      createIfNotExists: req.headers && req.headers['x-forwarded-for'] == '35.208.110.100' ? true : false
    });

    await birdypet.create({
      variant: variant,
      member: req.body.loggedInUser
    });

    if (member.settings.general?.includes('updateWishlist')) {
      promises.push(Database.query('UPDATE wishlist SET intensity = 0 WHERE species = ? AND `member` = ?', [birdypet.bird.code, member.id]));
    }

    promises.push(PubSub.publish('background', 'COLLECT', {
      birdypet: birdypet.id,
      member: req.body.loggedInUser,
      variant: variant,
      adjective: req.body.adjective,
      freebird: req.body.freebird,
      source: req.headers && req.headers['x-forwarded-for'] == '35.208.110.100' ? 'DISCORD' : 'WEB'
    }));

    Promise.all(promises).then(() => {
      if (birdypet.id) {
        if (req.body.adjective) {
          Database.getOne('adjectives', {
            adjective: req.body.adjective
          }).then((egg) => {
            birdypet.egg = egg;
            resolve(res.json(birdypet));
          });
        } else {
          res.json(birdypet);
        }
      } else {
        resolve(res.sendStatus(404));
      }
    });
  }).catch((err) => {
    console.error(err);
  });
};
