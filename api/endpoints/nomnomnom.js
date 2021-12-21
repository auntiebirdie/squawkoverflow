const BirdyPet = require('../models/birdypet.js');
const Member = require('../models/member.js');

module.exports = async (req, res) => {
  if (!req.body.loggedInUser) {
    return res.sendStatus(401);
  }

  let birdypet = new BirdyPet(req.body.birdypet);
  let member = new Member(req.body.loggedInUser);

  await birdypet.fetch();

  if (birdypet.id) {
    await member.fetch();

    if (member.bugs > 0) {
      await Promise.all([
        await member.set({
          bugs: --member.bugs
        }),
        await birdypet.set({
          friendship: (birdypet.friendship * 1 || 0) + 5
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
