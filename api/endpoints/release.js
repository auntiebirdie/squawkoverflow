const BirdyPet = require('../models/birdypet.js');
const Counters = require('../helpers/counters.js');
const Illustration = require('../models/illustration.js');
const Redis = require('../helpers/redis.js');

module.exports = async (req, res) => {
  if (!req.body.loggedInUser) {
    return res.sendStatus(401);
  }

  let illustration = null;

  if (req.body.illustration) {
    illustration = new Illustration(req.body.illustration);
  } else if (req.body.birdypet) {
    let birdypet = new BirdyPet(req.body.birdypet);

    await birdypet.fetch();

    if (!birdypet) {
      return res.sendStatus(404);
    } else if (birdypet.member != req.body.loggedInUser) {
      return res.sendStatus(401);
    }

    illustration = {
      id: birdypet.illustration.id
    };

    await birdypet.delete();
    await Counters.increment(-1, 'birdypets', birdypet.member, birdypet.illustration.id);
  }

  if (illustration) {
    let id = await Redis.create('freebird', illustration.id);

    await Redis.connect().sendCommand('EXPIRE', [`freebird:${id}`, 2628000]);

    return res.sendStatus(200);
  } else {
    return res.sendStatus(400);
  }
};
