const BirdyPet = require('../models/birdypet.js');
const Member = require('../models/member.js');

module.exports = async (req, res) => {
  switch (req.method) {
    case "GET":
      if (req.query.id) {
        var member = new Member(req.query.id);

        await member.fetch(req.query).catch((err) => {
          console.log(err);
        });

        return res.json(member);
      } else {
        return res.json({});
      }
      break;
    case "PUT":
      var member = new Member(req.body.loggedInUser);
      var toUpdate = {};

      await member.fetch({
        include: ['profile']
      });

      if (req.body.member && member.admin) {
        member = new Member(req.body.member);

        toUpdate.contributor = req.body.contributor;
      } else {
        for (let key in req.body) {
          switch (key) {
            case "birdyBuddy":
            case "featuredFlock":
            case "username":
            case "avatar":
            case "birdatar":
            case "pronouns":
              toUpdate[key] = req.body[key];
              break;
          }
        }
      }

      member.set(toUpdate).then(() => {
        return res.ok();
      });
      break;
    case "DELETE":
      var member = new Member(req.body.loggedInUser);

      await member.delete().then(() => {
        return res.ok();
      });
      break;
    default:
      return res.error(405);
  }
};
