const Member = require('../models/member.js');
const chance = require('chance').Chance();

module.exports = (req, res) => {
  let promises = [];

  return new Promise(async (resolve, reject) => {
    for (let id of req.body.members) {
      let member = new Member(id);

      await member.fetch();

      promises.push(
        member.set({
          bugs: (member.bugs * 1) + ((req.body.bugs || 1) * 1)
        })
      );
    }

    await Promise.all(promises).then(() => {
      res.json(chance.pickone([
        "https://emojipedia-us.s3.dualstack.us-west-1.amazonaws.com/thumbs/120/openmoji/292/bug_1f41b.png",
        "https://emojipedia-us.s3.dualstack.us-west-1.amazonaws.com/thumbs/120/openmoji/292/ant_1f41c.png",
        "https://emojipedia-us.s3.dualstack.us-west-1.amazonaws.com/thumbs/120/openmoji/292/beetle_1fab2.png",
        "https://emojipedia-us.s3.dualstack.us-west-1.amazonaws.com/thumbs/120/openmoji/292/lady-beetle_1f41e.png",
        "https://emojipedia-us.s3.dualstack.us-west-1.amazonaws.com/thumbs/120/openmoji/292/cricket_1f997.png",
        "https://emojipedia-us.s3.dualstack.us-west-1.amazonaws.com/thumbs/120/openmoji/292/mosquito_1f99f.png"
      ]));
    });
  });
};