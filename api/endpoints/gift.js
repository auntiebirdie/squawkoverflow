const Member = require('../models/member.js');
const BirdyPet = require('../models/birdypet.js');

const Counters = require('../helpers/counters.js');
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

      let birdypet = new BirdyPet(req.body.birdypet);

      await birdypet.fetch();

      let fromMember = new Member(req.body.loggedInUser);
      let toMember = new Member(req.body.member);

      if (birdypet.member == fromMember.id) {
        await Promise.all([
          fromMember.fetch(),
          toMember.fetch(),
          Counters.increment(1, 'birdypets', toMember.id, birdypet.illustration.id),
          Counters.increment(-1, 'birdypets', fromMember.id, birdypet.illustration.id)
        ]);

        if (toMember.settings.general?.includes('updateWishlist')) {
          await toMember.updateWishlist(birdypet.bird.code, "remove");
        }

        await birdypet.set({
          member: toMember.id,
          flocks: "NONE",
          friendship: 0
        });

        await Webhook('exchange', {
          content: `${fromMember.username} has sent <@${toMember.id}> a gift!`,
          embeds: [{
            title: birdypet.nickname || birdypet.bird.name,
            description: birdypet.illustration.label || " ",
            url: `https://squawkoverflow.com/birdypet/${birdypet.id}`,
            image: {
              url: birdypet.illustration.image
            }
          }]
        });

        return res.sendStatus(200);
      } else {
        return res.sendStatus(404);
      }
  }
};
