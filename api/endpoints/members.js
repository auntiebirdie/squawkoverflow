const Members = require('../collections/members.js');

module.exports = (req, res) => {
  return Members.all().then((members) => {
    if (req.query.privacy) {
      members = members.filter((member) => !member.settings.privacy?.includes(req.query.privacy));
    }

    return res.json(members);
  });
};
