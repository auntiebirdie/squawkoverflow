const BirdyPet = require('../models/birdypet.js');
const Member = require('../models/member.js');

module.exports = async (req, res) => {
  switch (req.method) {
    case "GET":
		  console.log(req.query);
      var member = new Member(req.query.id);

      await member.fetch(req.query);

      return res.json(member);
      break;
    case "PUT":
      var member = new Member(req.body.loggedInUser);
      var toUpdate = {};

      await member.fetch({
        profile: true
      });

      toUpdate.settings = member.settings;

      for (let key in req.body) {
        switch (key) {
          case "birdyBuddy":
          case "username":
          case "avatar":
            toUpdate[key] = req.body[key];
            break;
          case "pronouns":
            toUpdate[key] = JSON.parse(req.body[key]);
            break;
          case "settings":
            Object.keys(req.body.settings).filter((val) => ["theme", "general", "privacy"].includes(val)).forEach((key) => {
              if (key == "theme") {
                toUpdate.settings[key] = req.body.settings[key];
              } else {
                toUpdate.settings[key] = req.body.settings[key].split(',');
              }
            });
            break;
        }
      }

      await member.set(toUpdate);

      return res.sendStatus(200);
      break;
    default:
      return res.sendStatus(405);
  }
};
