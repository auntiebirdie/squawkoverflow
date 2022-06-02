const Member = require('../models/member.js');
const Database = require('../helpers/database.js');
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
        }),
        req.body.awardBadge ? Database.query('INSERT IGNORE INTO member_badges VALUES (?, "bug", NOW())', [member.id]) : null
      );
    }

    await Promise.all(promises).then(() => {
      res.json(chance.pickone(require('../data/bugs.json')));
    });
  });
};
