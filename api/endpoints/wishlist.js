const BirdyPet = require('../models/birdypet.js');
const Member = require('../models/member.js');

module.exports = async (req, res) => {
  if (!req.body.loggedInUser) {
    return res.sendStatus(401);
  }

  let member = new Member(req.body.loggedInUser);

  await member.updateWishlist(req.body.speciesCode, req.body.method == "DELETE" ? "remove" : "add");

  return res.sendStatus(200);
};
