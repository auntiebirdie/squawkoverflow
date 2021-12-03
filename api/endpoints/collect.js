const BirdyPet = require('../models/birdypet.js');
const Member = require('../models/member.js');
const MemberPet = require('../models/memberpet.js');

const Counters = require('../helpers/counters.js');
const Redis = require('../helpers/redis.js');

const {
  PubSub,
  v1
} = require('@google-cloud/pubsub');

const pubSubClient = new PubSub();
const subClient = new v1.SubscriberClient();

module.exports = (req, res) => {
    return new Promise(async (resolve, reject) => {
      if (!req.body.loggedInUser) {
        resolve(res.sendStatus(401));
      }

      let memberpet = new MemberPet();
      let member = new Member(req.body.loggedInUser);
      let birdypet = null;
      let promises = [];

      if (req.body.freebird) {
        birdypet = new BirdyPet(await Redis.get('freebird', req.body.freebird));
      } else {
        birdypet = new BirdyPet(req.body.birdypet);
      }

      if (birdypet.species) {
        await memberpet.create({
          birdypet: birdypet.id,
          member: member.id
        });

        if (memberpet.id) {
          await member.fetch();

          await Counters.increment(1, 'species', member.id, birdypet.species.speciesCode);

          if (member.settings.general?.includes('updateWishlist')) {
            member.updateWishlist(memberpet.birdypetSpecies, "remove");
          }

          if (req.body.adjective) {
            promises.push(member.set({
              lastHatchedAt: Date.now()
            }));

            if (!member.settings.privacy?.includes('activity') && req.headers['x-forwarded-for']) {
              promises.push(pubSubClient.topic(`egg-hatchery`).publish(Buffer.from(""), {
                member: req.body.loggedInUser,
                adjective: req.body.adjective,
                birdypet: req.body.birdypet,
                userpet: memberpet.id
              }));
            }
          } else if (req.body.freebird) {
            promises.push(Redis.delete('freebird', req.body.freebird));
          }

          await Promise.all(promises).then(() => {
            resolve(res.json(memberpet));
          });
        } else {
          resolve(res.sendStatus(404));
        }
      } else {
        resolve(res.sendStatus(404));
      }
    }).catch( (err) => {
	    console.error("uwu crash");
	    console.error(err);
    });
};
