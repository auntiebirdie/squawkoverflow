const Member = require('../models/member.js');

module.exports = async (req, res) => {
  return new Promise(async (resolve, reject) => {
    switch (req.method) {
      case "POST":
        let member = new Member(req.body.loggedInUser);

        member.fetch({
          include: ['birdyBuddy']
        });

        if (member.birdyBuddy?.variant) {
          await member.birdyBuddy.set({
            friendship: Math.min(100, Math.round(member.birdyBuddy.friendship + (req.body.friendship * 1)))
          });

          await member.birdyBuddy.fetch();
        }

        return res.json(member.birdyBuddy);
    }
  });
};
