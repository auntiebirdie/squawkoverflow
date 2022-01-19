const Member = require('../models/member.js');

module.exports = async (req, res) => {
  return new Promise(async (resolve, reject) => {
      let member = new Member(req.query.loggedInUser);

      member.fetch({
        include: 'birdyBuddy'
      });

      if (member.birdyBuddy?.variant) {
        await member.birdyBuddy.set({
          friendship: member.birdyBuddy.friendship + (req.query.friendship * 1)
        });
      }

    return res.send(member.birdyBuddy);
  });
};
