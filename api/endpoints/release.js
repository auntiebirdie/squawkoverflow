const MemberPet = require('../models/memberpet.js');

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
  }

  if (birdypet) {
    await pubSubClient.topic(`free-birds`).publish(Buffer.from(""), {
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
