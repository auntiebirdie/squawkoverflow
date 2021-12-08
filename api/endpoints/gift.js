const Member = require('../models/member.js');
const MemberPet = require('../models/memberpet.js');

const Cache = require('../helpers/cache.js');
const Counters = require('../helpers/counters.js');
const Webhook = require('../helpers/webhook.js');
const Redis = require('../helpers/redis.js');
const Search = require('../helpers/search.js');

module.exports = (req, res) => {
  Search.get(req.query).then((results) => {
    res.json(results);
  });
};

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

      let memberpet = new MemberPet(req.body.memberpet);

      await memberpet.fetch();

      let fromMember = new Member(req.body.loggedInUser);
      let toMember = new Member(req.body.member);

      if (memberpet.member == fromMember.id) {
        await Promise.all([
          fromMember.fetch(),
          toMember.fetch(),
          Counters.increment(1, 'birdypets', toMember.id, memberpet.birdypetId),
          Counters.increment(-1, 'birdypets', fromMember.id, memberpet.birdypetId)
        ]);

        if (toMember.settings.general?.includes('updateWishlist')) {
          await toMember.updateWishlist(memberpet.speciesCode, "remove");
        }

        await memberpet.set({
          member: toMember.id,
          flocks: "NONE",
          friendship: 0
        });

        await Webhook('exchange', {
          content: `${fromMember.username} has sent <@${toMember.id}> a gift!`,
          embeds: [{
            title: memberpet.species,
            description: memberpet.label || " ",
            url: `https://squawkoverflow.com/birdypet/${memberpet.id}`,
            image: {
              url: memberpet.image
            }
          }]
        });

        return res.sendStatus(200);
      } else {
        return res.sendStatus(404);
      }
  }
};
