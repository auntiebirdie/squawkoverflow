const Member = require('../models/member.js');
const BirdyPet = require('../models/birdypet.js');

const Database = require('../helpers/database.js');
const PubSub = require('../helpers/pubsub.js');
const Search = require('../helpers/search.js');

module.exports = async (req, res) => {
  switch (req.method) {
    case "GET":
      Search.get(req.query).then((results) => {
        res.json(results);
      });
      break;
    case "POST":
      if (!req.body.loggedInUser) {
        return res.sendStatus(401);
      }

      if (req.body.birdypet) {
        var birdypet = new BirdyPet(req.body.birdypet);

        await birdypet.fetch();

        await birdypet.set({
          member: req.body.member,
          addedAt: new Date()
        });
      } else if (req.body.variant) {
        var birdypet = new BirdyPet();

        await birdypet.create({
          member: req.body.member,
          variant: req.body.variant
        });
      } else {
        return res.sendStatus(404);
      }

      let fromMember = new Member(req.body.loggedInUser);
      let toMember = new Member(req.body.member);

      if (birdypet.member == fromMember.id || req.body.variant) {
        let promises = [];

        if (req.body.variant) {
          await birdypet.set({
            member: toMember.id
          });
        }

        promises.push(Database.create('notifications', {
          id: Database.key(),
          member: toMember.id,
          type: 'birdypet_gift',
          data: {
            "from": fromMember.id,
            "birdypet": birdypet.id
          }
        }));

        promises.push(PubSub.publish('background', 'COLLECT', {
          member: toMember.id,
          birdypet: birdypet.id,
          variant: birdypet.variant.id
        }));

        Promise.all(promises).then(() => {
          return res.sendStatus(200);
        });
      } else {
        return res.sendStatus(404);
      }
  }
};
