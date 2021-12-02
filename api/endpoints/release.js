const Counters = require('../helpers/counters.js');
const MemberPet = require('../models/memberpet.js');
const Redis = require('../helpers/redis.js');

module.exports = async (req, res) => {
  if (!req.body.loggedInUser) {
    return res.sendStatus(401);
  }

  let birdypet = null;

  if (req.body.birdypet) {
    let birdypets = require('../data/birdypets.json');

    birdypet = birdypets.find((birdypet) => birdypet.id == req.body.birdypet);

    if (!birdypet) {
      return res.sendStatus(404);
    }
  } else if (req.body.memberpet) {
    let memberpet = new MemberPet(req.body.memberpet);

    await memberpet.fetch();

    if (!memberpet) {
      return res.sendStatus(404);
    } else if (memberpet.member != req.body.loggedInUser) {
      return res.sendStatus(401);
    }

    birdypet = {
      id: memberpet.birdypetId
    };

    await memberpet.delete();

    await Counters.increment(-1, 'species', member.id, memberpet.species.speciesCode);
  }

  if (birdypet) {
    await Redis.create('freebird', birdypet.id);

    return res.sendStatus(200);
  } else {
    return res.sendStatus(400);
  }
};
