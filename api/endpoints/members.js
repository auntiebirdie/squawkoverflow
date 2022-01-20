const Members = require('../collections/members.js');
const Bird = require('../models/bird.js');

module.exports = (req, res) => {
  return Members.all().then(async (members) => {
    let promises = [];

    if (req.query.privacy) {
      members = members.filter((member) => !member.settings.privacy?.includes(req.query.privacy));
    }

    if (req.query.include?.includes('birdData')) {
      let bird = new Bird(req.query.bird);

      for (let member of members) {
	      promises.push(bird.fetchMemberData(member.id).then( (data) => {
		      member.owned = data.owned;
		      member.wishlisted = data.wishlisted;
	      }));
      }
    }

    await Promise.all(promises);

    return res.json(members);
  });
};
