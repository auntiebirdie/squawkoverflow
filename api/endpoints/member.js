const BirdyPet = require('../models/birdypet.js');
const Member = require('../models/member.js');

module.exports = async (req, res) => {
  switch (req.method) {
    case "GET":
      var member = new Member(req.query.id);

      await member.fetch(req.query);

      return res.json(member);
      break;
    case "PUT":
      var member = new Member(req.body.loggedInUser);
      var toUpdate = {};

      await member.fetch({
        include: ['profile']
      });

      toUpdate.settings = member.settings;

      for (let key in req.body) {
        switch (key) {
          case "birdyBuddy":
          case "featuredFlock":
          case "username":
          case "avatar":
          case "birdatar":
            toUpdate[key] = req.body[key];
            break;
          case "pronouns":
            toUpdate[key] = JSON.parse(req.body[key]);
            break;
        }
      }

      member.set(toUpdate).then(() => {
        return res.sendStatus(200);
      });
      break;
    case "DELETE":
      var member = new Member(req.body.loggedInUser);

      await member.delete().then(() => {
        return res.sendStatus(200);
      });
      break;
    default:
      return res.sendStatus(405);
  }
};
