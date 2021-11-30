const Member = require('../models/member.js');
const MemberPet = require('../models/memberpet.js');

const Redis = require('../helpers/redis.js');

module.exports = async (req, res) => {
  if (!req.body.loggedInUser) {
    return res.sendStatus(401);
  }

  let memberpet = new MemberPet();
  let member = new Member(req.body.loggedInUser);
  let birdypet = null;

  if (req.body.freebird) {
    birdypet = await Redis.get('freebird', req.body.freebird);
  } else {
    birdypet = req.body.birdypet;
  }

  await memberpet.create({
    birdypet: birdypet,
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
    } else if (req.body.freebird) {
      await Redis.delete('freebird', req.body.freebird);
    }

    return res.status(200).json(memberpet.id);
  } else {
    return res.sendStatus(404);
  }
};
