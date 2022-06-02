const Database = require('../helpers/database.js');
const Member = require('../models/member.js');

module.exports = async (req, res) => {
  switch (req.method) {
    case "GET":
      var badges = await Database.get('badges', null, { order : 'displayOrder' });

      var member = new Member(req.query.member);

      await member.fetch({
        include: ['badges']
      }).catch((err) => {
        console.log(err);
      });

        return res.json(badges);
      break;
    default:
      return res.error(405);
  }
};
