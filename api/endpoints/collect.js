const BirdyPet = require('../models/birdypet.js');
const Member = require('../models/member.js');
const MemberPet = require('../models/memberpet.js');

const Counters = require('../helpers/counters.js');
const Redis = require('../helpers/redis.js');
const Webhook = require('../helpers/webhook.js');

module.exports = (req, res) => {
  return new Promise(async (resolve, reject) => {
    if (!req.body.loggedInUser) {
      resolve(res.status(401).send());
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

        promises.push(Counters.increment(1, 'birdypets', member.id, birdypet.id));

        if (member.settings.general?.includes('updateWishlist')) {
          member.updateWishlist(birdypet.speciesCode, "remove");
        }

        if (req.body.adjective) {
          promises.push(member.set({
            lastHatchedAt: Date.now()
          }));

          if (!member.settings.privacy?.includes('activity') && req.headers && req.headers['x-forwarded-for']) {
            await Webhook('egg-hatchery', {
              content: " ",
              embeds: [{
                title: birdypet.species,
                description: `<@${member.id}> hatched the ${req.body.adjective} egg!`,
                url: `https://squawkoverflow.com/birdypet/${memberpet.id}`,
                image: {
                  url: birdypet.image
                }
              }]
            });
          }
        } else if (req.body.freebird) {
          promises.push(Redis.delete('freebird', req.body.freebird));
        }

        await Promise.all(promises).then(() => {
          resolve(res.json(memberpet));
	});
      } else {
        resolve(res.status(404).send());
      }
    } else {
      resolve(res.status(404).send());
    }
  }).catch((err) => {
    console.error("uwu crash");
    console.error(err);
  });
};
