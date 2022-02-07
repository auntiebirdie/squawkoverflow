const Members = require('../collections/members.js');
const Bird = require('../models/bird.js');

module.exports = (req, res) => {
  return Members.all().then(async (members) => {
    let promises = [];

    if (!req.query.include?.includes('self') && req.query.loggedInUser) {
      members = members.filter((member) => member.id != req.query.loggedInUser);
    }

    if (req.query.privacy) {
      members = members.filter((member) => {
        return !member.settings[`privacy_${req.query.privacy}`];
      });
    }

    if (req.query.search) {
	    try {
      let substrRegex = new RegExp(req.query.search, 'i');

      members = members.filter((member) => {
        return substrRegex.test(member.username);
      });
	    }
	    catch (err) { }
    }

    if (req.query.include?.includes('birdData')) {
      for (let member of members) {
        promises.push(new Bird(req.query.bird).fetchMemberData(member.id).then((data) => {
          member.owned = data.owned;
          member.wishlisted = data.wishlisted;
        }));
      }
    }

    await Promise.all(promises);

    return res.json(members);
  });
};
