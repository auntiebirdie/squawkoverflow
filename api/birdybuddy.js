const Member = require('../models/member.js');
const secrets = require('../secrets.json');

module.exports = async (req, res) => {
  return new Promise(async (resolve, reject) => {
    switch (req.method) {
      case "POST":
        if (req.body.KNOCKKNOCK == secrets.WHOSTHERE) {
          let member = new Member(req.body.loggedInUser);

          await member.fetch({
            include: ['birdyBuddy']
          });

          if (member.birdyBuddy?.variant) {
            await member.birdyBuddy.set({
              friendship: Math.min(100, Math.round(member.birdyBuddy.friendship + (req.body.friendship * 1)))
            });

            await member.birdyBuddy.fetch();
          }

          return res.json(member.birdyBuddy);
        } else {
          return res.status(403);
        }
    }
  });
};
