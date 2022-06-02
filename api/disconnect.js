const Database = require('../helpers/database.js');
const Member = require('../models/member.js');

module.exports = async (req, res) => {
  let member = new Member(req.body.loggedInUser);

  await member.fetch({ include: ['auth'] });

  if (member.auth && member.auth.length > 1) {
    await Database.query('DELETE FROM member_auth WHERE `member` = ? AND provider = ?', [member.id, req.body.provider]);

    res.ok();
  } else {
    res.error(400);
  }
};
