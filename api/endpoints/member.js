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
        profile: true
      });

      toUpdate.settings = member.settings;

      if (req.body.settings) {
        Object.keys(req.body.settings).filter((val) => ["theme", "general", "privacy"].includes(val)).forEach((key) => {
          if (key == "theme") {
            toUpdate.settings[key] = req.body.settings[key];
          } else {
            toUpdate.settings[key] = req.body.settings[key].split(',');
          }
        });
      }

      if (req.body.birdyBuddy) {
        toUpdate.birdyBuddy = req.body.birdyBuddy;
      }

      if (req.body.pronouns) {
        toUpdate.pronouns = JSON.parse(req.body.pronouns);
      }

      await member.set(toUpdate);

      return res.sendStatus(200);
      break;
    default:
      return res.sendStatus(405);
  }
};
