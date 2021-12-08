const Member = require('../models/member.js');
const BirdyPet = require('../models/birdypet.js');

const Redis = require('../helpers/redis.js');

module.exports = async (req, res) => {
  switch (req.method) {
    case "GET":
      var birdypet = new BirdyPet(req.query.id);

      await birdypet.fetch(req.query);

      res.json(birdypet);
      break;
    case "POST":
      if (!req.body.loggedInUser) {
        return res.sendStatus(401);
      }

      var birdypet = new BirdyPet();
      var member = new Member(req.body.loggedInUser);

      await birdypet.create({
        birdypet: req.body.birdypet,
        member: member.id
      });

      if (birdypet.id) {
        await member.fetch();

        if (member.settings.general?.includes('updateWishlist')) {
          member.updateWishlist(birdypet.speciesCode, "remove");
        }

        if (req.body.adjective) {
          await member.set({
            lastHatchedAt: Date.now()
          });

          if (!member.settings.privacy?.includes('activity') && req.headers['x-forwarded-for']) {
		  // TODO : webhook
          }
        }

        return res.status(200).json(birdypet.id);
      } else {
        return res.sendStatus(404);
      }
      break;
    case "PUT":
      if (!req.body.loggedInUser) {
        return res.sendStatus(401);
      }

      var birdypet = new BirdyPet(req.body.birdypet);
      var member = new Member(req.body.loggedInUser);

      await birdypet.fetch();

      if (birdypet.member == member.id) {
        let nickname = req.body.nickname || birdypet.nickname || "";
        let variant = req.body.variant || birdypet.illustration.id;
        let description = req.body.description || birdypet.description || "";
        let flocks = req.body.flocks || birdypet.flocks || [];

        if (nickname.length > 50) {
          nickname = nickname.slice(0, 50);
        }

        if (description.length > 500) {
          description = description.slice(0, 500);
        }

        if (req.body.flock) {
          let index = flocks.indexOf(req.body.flock);

          if (index !== -1) {
            flocks = flocks.filter( (flock) => flock != req.body.flock);
          } else {
            flocks.push(req.body.flock);
          }
        }

        await birdypet.set({
          nickname: nickname,
          description: description,
          illustration: variant,
          flocks: flocks
        });

        return res.sendStatus(200);
      } else {
        return res.sendStatus(405);
      }
      break;
  }
};
