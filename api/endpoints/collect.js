const BirdyPet = require('../models/birdypet.js');
const Illustration = require('../models/illustration');
const Member = require('../models/member.js');

const Counters = require('../helpers/counters.js');
const Redis = require('../helpers/redis.js');
const Webhook = require('../helpers/webhook.js');

module.exports = (req, res) => {
  return new Promise(async (resolve, reject) => {
    if (!req.body.loggedInUser) {
      resolve(res.status(401).send());
    }

    let birdypet = new BirdyPet();
    let member = new Member(req.body.loggedInUser);
    let illustration = null;
    let promises = [];

    if (req.body.freebird) {
      illustration = await Redis.get('freebird', req.body.freebird);
    } else {
      illustration = req.body.illustration;
    }

    await birdypet.create({
      illustration: illustration,
      member: member.id
    });

    if (birdypet.id) {
      await member.fetch();

      promises.push(Counters.increment(1, 'birdypets', member.id, illustration));

      if (member.settings.general?.includes('updateWishlist')) {
        member.updateWishlist(birdypet.bird.code, "remove");
      }

      if (req.body.adjective) {
        promises.push(member.set({
          lastHatchedAt: Date.now()
        }));

        if (!member.settings.privacy?.includes('activity') && req.headers && req.headers['x-forwarded-for']) {
          await Webhook('egg-hatchery', {
            content: " ",
            embeds: [{
              title: illustration.bird.name,
              description: `<@${member.id}> hatched the ${req.body.adjective} egg!`,
              url: `https://squawkoverflow.com/birdypet/${birdypet.id}`,
              image: {
                url: illustration.image
              }
            }]
          });
        }
      } else if (req.body.freebird) {
        promises.push(Redis.delete('freebird', req.body.freebird));
      }

      await Promise.all(promises).then(() => {
        resolve(res.json(birdypet));
      });
    } else {
      resolve(res.sendStatus(404));
    }
  }).catch((err) => {
    console.error("uwu crash");
    console.error(err);
  });
};
