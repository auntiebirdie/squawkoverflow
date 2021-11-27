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

      await member.fetch({
        profile: true
      });

      var fields = ["theme", "general", "privacy"];
      var settings = member.settings;

      if (req.body.settings) {
        Object.keys(req.body.settings).filter((val) => fields.includes(val)).forEach((key) => {
          if (key == "theme") {
            settings[key] = req.body.settings[key];
          } else {
            settings[key] = req.body.settings[key].split(',');
          }
        });
      }

      await member.set({
        settings: settings,
        birdyBuddy: req.body.birdyBuddy || member.birdyBuddy.id
      });

      return res.sendStatus(200);
      break;
    default:
      return res.sendStatus(405);
  }
};
