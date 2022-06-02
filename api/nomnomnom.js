const BirdyPet = require('../models/birdypet.js');
const Member = require('../models/member.js');

module.exports = async (req, res) => {
  if (!req.body.loggedInUser) {
    return res.error(401);
  }

  let birdypet = new BirdyPet(req.body.birdypet);
  let member = new Member(req.body.loggedInUser);

  await birdypet.fetch();

  if (birdypet.id) {
    await member.fetch();

    if (member.bugs > 0 && birdypet.friendship < 100) {
      await Promise.all([
        await member.set({
          bugs: --member.bugs
        }),
        await birdypet.set({
          friendship: (birdypet.friendship * 1 || 0) + 5
        })
      ]);

      await birdypet.fetch();

      res.json({
        bugs: member.bugs,
        friendshipMeter: birdypet.friendshipMeter,
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
        error: member.bugs == 0 ? "You don't have any more bugs!" : `${birdypet.nickname || birdypet.bird.commonName} is full!`
      });
    }
  }
};
