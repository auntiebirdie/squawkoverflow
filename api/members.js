const Bird = require('../models/bird.js');
const Members = require('../collections/members.js');
const Member = require('../models/member.js');
const Search = require('../helpers/search.js');

module.exports = (req, res) => {
  if (req.query.page) {
    return Search.query('member', req.query).then((response) => {
      var promises = [];

      response.results = response.results.map((result) => {
        result = new Member(result.id);
        promises.push(result.fetch(req.query));

        return result;
      });

      Promise.all(promises).then(() => {
        res.json(response);
      });
    });
  } else {
    return Members.all(req.query).then(async (members) => {
      let promises = [];

      if (!req.query.include?.includes('self') && req.query.loggedInUser) {
        members = members.filter((member) => member.id != req.query.loggedInUser);
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

      if (req.query.privacy?.includes('gifts') && req.query.include?.includes('birdData')) {
        members = members.filter((member) => !member.settings['privacy_gifts_unwishlisted'] || member.wishlisted > 0);
      }

      return res.json(members);
    });
  }
};
