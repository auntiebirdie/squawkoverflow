const Member = require('../models/member.js');
const MemberPet = require('../models/memberpet.js');

const Redis = require('../helpers/redis.js');

module.exports = async (req, res) => {
  switch (req.method) {
    case "GET":
      var memberpet = new MemberPet(req.query.id);

      await memberpet.fetch(req.query);

      res.json(memberpet);
      break;
    case "POST":
      if (!req.body.loggedInUser) {
        return res.sendStatus(401);
      }

      var memberpet = new MemberPet();
      var member = new Member(req.body.loggedInUser);

      await memberpet.create({
        birdypet: req.body.birdypet,
        member: member.id
      });

      if (memberpet.id) {
        await member.fetch();

        if (member.settings.general?.includes('updateWishlist')) {
          member.updateWishlist(memberpet.birdypetSpecies, "remove");
        }

        if (req.body.adjective) {
          await member.set({
            lastHatchedAt: Date.now()
          });

          if (!member.settings.privacy?.includes('activity') && req.headers['x-forwarded-for']) {
            await pubSubClient.topic(`squawkoverflow-egg-hatchery`).publish(Buffer.from(""), {
              member: req.body.loggedInUser,
              adjective: req.body.adjective,
              birdypet: req.body.birdypet,
              userpet: memberpet.id
            });
          }
        }

        return res.status(200).json(memberpet.id);
      } else {
        return res.sendStatus(404);
      }
      break;
    case "PUT":
      if (!req.body.loggedInUser) {
        return res.sendStatus(401);
      }

      var memberpet = new MemberPet(req.body.memberpet);
      var member = new Member(req.body.loggedInUser);

      await memberpet.fetch();

      if (memberpet.member == member.id) {
        let nickname = req.body.nickname;
        let variant = req.body.variant || memberpet.birdypetId;
        let description = req.body.description;
        let flocks = req.body.flocks || ["NONE"];

        if (nickname.length > 50) {
          nickname = nickname.slice(0, 50);
        }

        if (description.length > 500) {
          description = description.slice(0, 500);
        }

        await memberpet.set({
          nickname: nickname,
          description: description,
          birdypetId: variant,
          flocks: flocks.map((flock) => flock).join(',')
        });

        return res.sendStatus(200);
      } else {
        return res.sendStatus(405);
      }
      break;
  }
};
