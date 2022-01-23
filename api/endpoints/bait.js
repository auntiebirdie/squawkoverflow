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

	    if (member.bugs > 0) {
        promises.push(
          member.set({
            bugs: (member.bugs * 1) - 1
          })
        );

        promises.push(Database.query('INSERT INTO counters VALUES (?, ?, ?, ?) ON DUPLICATE KEY UPDATE count = 1', [member.id, 'bait', "", 1]));

          let birdypet = new BirdyPet();
          let variant = await Database.query('SELECT id FROM variants WHERE species IN (SELECT species FROM wishlist WHERE `member` = ?) AND special = 0 ORDER BY RAND() LIMIT 1', [member.id]);

          await birdypet.create({
            variant: variant.id,
            member: member.id
          });

          promises.push(PubSub.publish('background', 'COLLECT', {
            member: member.id,
            birdypet: birdypet.id,
            variant: birdypet.variant.id
          }));

          await Promise.all(promises).then(() => {
            res.json(birdypet.id);
          });
	    }
	    else {
		    res.status(404).send("You have no bugs!");
	    }
        });
    };
