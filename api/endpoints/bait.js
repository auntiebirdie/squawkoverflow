const BirdyPet = require('../models/birdypet.js');
const Chance = require('chance').Chance();
const Counters = require('../helpers/counters.js');
const Database = require('../helpers/database.js');
const Member = require('../models/member.js');
const PubSub = require('../helpers/pubsub.js');
const Variant = require('../models/variant.js');
const Webhook = require('../helpers/webhook.js');

module.exports = (req, res) => {
  let promises = [];

  return new Promise(async (resolve, reject) => {
    let member = new Member(req.body.loggedInUser);

    await member.fetch();

    if (member.bugs > 0) {
      promises.push(
        member.set({
          bugs: (member.bugs * 1) - 1
        })
      );

      promises.push(Database.query('INSERT INTO counters VALUES (?, ?, ?, ?) ON DUPLICATE KEY UPDATE count = 1', [member.id, 'bait', "", 1]));

      let birdypet = new BirdyPet();
      let variant = await Database.query('SELECT variants.id, variants.species FROM variants JOIN wishlist ON (variants.species = wishlist.species) WHERE wishlist.member = ? AND special = 0 ORDER BY wishlist.intensity DESC, RAND() LIMIT 1', [member.id]);

      variant = new Variant(variant.id);

      await variant.fetch();

      await birdypet.create({
        variant: variant.id,
        member: member.id
      });

      promises.push(Database.set('wishlist', {
        member: member.id,
        species: variant.bird.code
      }, {
        intensity: 0
      }));

      if (process.env.NODE_ENV == "PROD" && member.serverMember && !member.settings.privacy?.includes('activity')) {
        promises.push(Webhook('birdwatching', {
          content: " ",
          embeds: [{
            title: variant.bird.commonName,
            description: `<@${member.id}> attracted a beloved bird with a bug!`,
            url: `https://squawkoverflow.com/birdypet/${birdypet.id}`,
            image: {
              url: variant.image
            },
            thumbnail: {
              url: Chance.pickone(require('../data/bugs.json'))
            }
          }]
        }));
      }

      promises.push(PubSub.publish('background', 'COLLECT', {
        member: member.id,
        birdypet: birdypet.id,
        variant: variant.id
      }));

      await Promise.all(promises).then(() => {
        res.json(birdypet.id);
      });
    } else {
      res.status(404).send("You have no bugs!");
    }
  });
};