const {
  PubSub
} = require('@google-cloud/pubsub');

const pubSubClient = new PubSub();

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
    const Redis = require('../helpers/redis.js');

    let memberpet = await Redis.get('memberpet', req.body.memberpet);

    if (!memberpet) {
      return res.sendStatus(404);
    } else if (memberpet.member != req.body.loggedInUser) {
      return res.sendStatus(401);
    }

    await Redis.delete('memberpet', memberpet._id);

    birdypet = {
      id: memberpet.birdypetId
    };
  }

  if (birdypet) {
    pubSubClient.topic(`squawkoverflow-free-birds`).publish(Buffer.from(""), {
      member: req.body.loggedInUser,
      birdypet: birdypet.id,
      source: "WEB"
    }).then(() => {
      return res.sendStatus(200);
    });
  } else {
    return res.sendStatus(400);
  }
};
