const Member = require('../models/member.js');

module.exports = async (req, res) => {
  let member = new Member(req.query.id);

  await member.fetch({ full : req.query.full ? true : false });

  return res.json(member);
};
