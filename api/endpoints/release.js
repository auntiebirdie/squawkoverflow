const BirdyPet = require('../models/birdypet.js');
const Counters = require('../helpers/counters.js');
const MemberPet = require('../models/memberpet.js');
const Redis = require('../helpers/redis.js');

module.exports = async (req, res) => {
  if (!req.body.loggedInUser) {
    return res.sendStatus(401);
  }

  let birdypet = null;

  if (req.body.birdypet) {
    birdypet = new BirdyPet(req.body.birdypet);
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
    await Counters.increment(-1, 'birdypets', memberpet.member, memberpet.birdypetId);
  }

  if (birdypet) {
    Redis.create('freebird', birdypet.id);

    return res.sendStatus(200);
  } else {
    return res.sendStatus(400);
  }
};
