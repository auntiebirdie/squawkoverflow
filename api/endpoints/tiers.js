const Database = require('../helpers/database.js');
const Member = require('../models/member.js');

module.exports = async (req, res) => {
  let member = new Member(req.query.member);

  await member.fetch();

  Database.query(`
	  SELECT *
	  FROM tiers
	  WHERE member = ? OR id = ? OR
	  (id < 4 && id < ?)
	  `, [member.id, member.tier.id, member.tier.id]).then((tiers) => {
    res.json(tiers);
  });
};
