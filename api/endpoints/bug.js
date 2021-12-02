const Member = require('../models/member.js');

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
      res.sendStatus(200);
    });
  });
};
