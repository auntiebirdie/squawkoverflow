const Member = require('../models/member.js');
const BirdyPet = require('../models/birdypet.js');

const Database = require('../helpers/database.js');
const PubSub = require('../helpers/pubsub.js');
const Webhook = require('../helpers/webhook.js');
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
        await fromMember.fetch();
        await toMember.fetch();

        let promises = [];

        if (req.body.variant) {
          await birdypet.set({
            member: toMember.id,
            friendship: 0
          });
        }

        if (fromMember.serverMember && toMember.serverMember) {
          promises.push(Webhook('gifts', {
            content: `${fromMember.username} has sent <@${toMember.id}> a gift!`,
            embeds: [{
              title: birdypet.nickname || birdypet.bird.commonName,
              description: birdypet.variant.label || " ",
              url: `https://squawkoverflow.com/birdypet/${birdypet.id}`,
              thumbnail: {
                url: 'https://emojipedia-us.s3.dualstack.us-west-1.amazonaws.com/thumbs/120/google/313/wrapped-gift_1f381.png'
              },
              image: {
                url: birdypet.variant.image
              }
            }]
          }));
        }

        promises.push(PubSub.publish('background', 'COLLECT', {
          member: toMember.id,
          birdypet: birdypet.id,
          variant: birdypet.variant.id
        }));

        return res.sendStatus(200);
      } else {
        return res.sendStatus(404);
      }
  }
};
