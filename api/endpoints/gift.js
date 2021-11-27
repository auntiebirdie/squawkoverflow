const Member = require('../models/member.js');
const MemberPet = require('../models/memberpet.js');

const Cache = require('../helpers/cache.js');
const Webhook = require('../helpers/webhook.js');
const Redis = require('../helpers/redis.js');

const birdsPerPage = 24;

module.exports = async (req, res) => {
  switch (req.method) {
    case "GET":
      var page = req.query.page || 1;
      var offset = --page * birdsPerPage;
      var filters = [
        `@member:{${req.query.loggedInUser}}`,
        req.query.family ? `@family:${req.query.family}` : '',
        req.query.flock ? `@flocks:{${req.query.flock}}` : '',
        req.query.search ? `@nickname|species:${Redis.escape(req.query.search)}` : ''
      ].join(' ');

      await Redis.fetch('memberpet', {
        'FILTER': filters,
        'SORTBY': JSON.parse(req.query.sort || []),
        'LIMIT': [offset, birdsPerPage]
      }).then(async (response) => {
        var wishlist = await Cache.get('wishlist', req.query.member);
        var output = [];

        for (var result of response.results) {
          var memberpet = new MemberPet(result._id);

          await memberpet.fetch();

          var owned = await Redis.fetch('memberpet', {
            'FILTER': `@member:{${req.query.member}} @birdypetSpecies:{${memberpet.birdypetSpecies}}`,
            'RETURN': ['birdypetId']
          }).then((owned) => owned.results.map((birdypet) => birdypet.birdypetId));

          output.push({
            ...memberpet,
            wishlisted: wishlist[memberpet.family] ? wishlist[memberpet.family].includes(memberpet.birdypetSpecies) : false,
            checkmark: owned.includes(memberpet.birdypetId) ? 2 : (owned.length > 0 ? 1 : 0)
          });
        }

        res.json({
          totalPages: Math.ceil(response.count / birdsPerPage),
          results: output
        });
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
          toMember.fetch()
        ]);

        if (toMember.settings.general?.includes('updateWishlist')) {
          await toMember.updateWishlist(memberpet.species.speciesCode, "remove");
        }

        await memberpet.set({
          member: toMember.id,
          flocks: "NONE",
          friendship: 0
        });

        await Webhook('exchange', {
          content: `${fromMember.username} has sent <@${toMember.id}> a gift!`,
          embeds: [{
            title: memberpet.species.commonName,
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