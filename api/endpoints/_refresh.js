const BirdyPet = require('../models/birdypet.js');
const Members = require('../collections/members.js');

module.exports = async (req, res) => {
  return new Promise((resolve, reject) => {
    if (req.query.member) {
      resolve(Members.get(req.query.member));
    } else {
      Members.all().then((members) => {
        // fix to lastRefresh sort ASC
        resolve(members.filter((member) => member.active).sort(() => .5 - Math.random())[0]);
      });
    }
  }).then(async (member) => {
    let promises = [];
    console.log(`Refreshing cache for ${member.id}`);

	  // TODO: update avatar, username, refresh counters

    console.log("DONE!");

    return res.sendStatus(200);
  });
};
