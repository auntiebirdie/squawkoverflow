const Member = require('../models/member.js');
const MemberPet = require('../models/memberpet.js');

module.exports = async (req, res) => {
  if (!req.body.loggedInUser) {
    return res.sendStatus(401);
  }

  let memberpet = new MemberPet(req.body.memberpet);
  let member = new Member(req.body.loggedInUser);

  await memberpet.fetch();

  if (memberpet.id) {
    await member.fetch();

    if (member.bugs > 0) {
      await Promise.all([
        await member.set({
          bugs: --member.bugs
        }),
        await memberpet.set({
          friendship: memberpet.friendship + 5
        })
      ]);

      res.json({
        bugs: member.bugs,
        response: [
          "Mmm!  Tastes like... bug.",
          "Tasty!",
          "Thanks!",
          "More?",
          "Oooh, that one was still wiggling.",
          "Yum!",
          "Another one!!"
        ].sort(() => .5 - Math.random())[0]
      });
    } else {
      res.json({
        error: "You don't have any more bugs!"
      });
    }
  }
};
