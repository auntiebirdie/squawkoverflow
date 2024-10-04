const BirdyPet = require('../models/birdypet.js');
const Counters = require('../helpers/counters.js');
const Database = require('../helpers/database.js');
const Member = require('../models/member.js');
const PubSub = require('../helpers/pubsub.js');

module.exports = (req, res) => {
  let promises = [];

  return new Promise(async (resolve, reject) => {
    let member = new Member(req.body.loggedInUser);

    await member.fetch();

    let freeWishlistUsed = await Counters.get("wishlist", member.id);

    if (!freeWishlistUsed) {
      let birdypet = new BirdyPet();
      let variant = await Database.query('SELECT variants.id, variants.species FROM variants JOIN wishlist ON (variants.species = wishlist.species) WHERE wishlist.member = ? AND wishlist.intensity > 0 ORDER BY wishlist.intensity DESC, RAND() LIMIT 1', [member.id]);

      await birdypet.create({
        variant: variant.id,
        member: member.id
      });

      promises.push(Database.query('INSERT INTO counters VALUES (?, ?, ?, ?) ON DUPLICATE KEY UPDATE count = 1', [member.id, 'wishlist', "", 1]));

      promises.push(Database.query('INSERT INTO birdypet_story VALUES (?, ?, ?, NULL, NOW())', [birdypet.id, "wishlisted", member.id]));

      PubSub.publish('background', 'COLLECT', {
        member: member.id,
        birdypet: birdypet.id,
        variant: variant.id,
        wishlist: true
      });

      await Promise.all(promises).then(() => {
        res.json(birdypet.id);
      });
    } else {
      res.error(403, "You have already attracted a bird to your aviary for free today!");
    }
  });
};
