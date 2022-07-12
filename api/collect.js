const BirdyPet = require('../models/birdypet.js');
const Member = require('../models/member.js');

const Counters = require('../helpers/counters.js');
const Database = require('../helpers/database.js');
const PubSub = require('../helpers/pubsub.js');

module.exports = (req, res) => {
  return new Promise(async (resolve, reject) => {
    if (!req.body.loggedInUser) {
      return resolve(res.error(401));
    }

    let member = new Member(req.body.loggedInUser);
    let birdypet = new BirdyPet(req.body.freebird);
    let promises = [];
    let variant = req.body.variant;
    let freebird = null;

    await member.fetch(req.headers && req.headers['x-forwarded-for'] == '35.208.110.100' ? {
      createIfNotExists: true,
      data: req.body.userData || {}
    } : {
      createIfNotExists: false,
      data: {}
    });

    if (req.body.freebird) {
      freebird = await Database.getOne('birdypets', {
        id: req.body.freebird,
        member: {
          comparator: 'IS',
          value_trusted: 'NULL'
        }
      });

      if (!freebird) {
        return res.json({
          error: 'Oops!  Someone already added this bird to their aviary!'
        });
      }

      await birdypet.fetch();

      await birdypet.set({
        member: member.id
      });

      await Database.query('INSERT INTO birdypet_story VALUES (?, ?, ?, NULL, NOW())', [birdypet.id, "collected", member.id]);
    } else {
      var updateLastHatchedAt = true;

      if (req.body.incubator) {
        let canIncubate = await Database.count('member_variants', {
          member: member.id,
          variant: variant
        });

        if (canIncubate) {
          updateLastHatchedAt = false;
        } else {
          return res.json({
            error: "Oops!  You can't incubate that bird!"
          });
        }
      } else if (!member.supporter) {
        let timeUntil = (Date.now() - new Date(member.lastHatchAt).getTime()) / 60000;

        if (timeUntil < 10) {
          timeUntil = 10 - timeUntil;

          return resolve(res.error(403, 'You can hatch another egg in ' + (timeUntil < 1 ? (Math.round(timeUntil * 60) + ' second' + (Math.round(timeUntil * 60) != 1 ? 's' : '')) : (Math.round(timeUntil) + ' minute' + (Math.round(timeUntil) != 1 ? 's' : ''))) + '.'));
        }
      }

      if (updateLastHatchedAt) {
        promises.push(Database.query('UPDATE members SET lastHatchAt = NOW() WHERE id = ?', [member.id]));
      }

      await birdypet.create({
        variant: variant,
        member: member.id,
        hatchedAt: new Date()
      });

      await Database.query('INSERT INTO birdypet_story VALUES (?, ?, ?, NULL, NOW())', [birdypet.id, "hatched", member.id]);
    }

    promises.push(PubSub.publish('background', 'COLLECT', {
      birdypet: birdypet.id,
      member: member.id,
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
        resolve(res.error(404));
      }
    });
  }).catch((err) => {
    res.json({
      error: err
    });
  });
};
