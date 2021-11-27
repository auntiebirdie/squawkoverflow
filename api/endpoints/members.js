const Members = require('../collections/members.js');

module.exports = (req, res) => {
  let collection = new Members();

  return collection.all().then((members) => {
    if (req.query.privacy) {
      members = members.filter((member) => !member.settings.privacy?.includes(req.query.privacy));
    }

    return res.json(members);
  });
};
