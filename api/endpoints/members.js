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
    return Members.all().then(async (members) => {
	    console.log('MEMBERS FETCHED');
      let promises = [];

      if (!req.query.include?.includes('self') && req.query.loggedInUser) {
        members = members.filter((member) => member.id != req.query.loggedInUser);
      }

      if (req.query.privacy) {
        members = members.filter((member) => {
          return !member.settings[`privacy_${req.query.privacy}`];
        });
      }

	    console.log('MEMBERS FILTERED');

      if (req.query.search) {
        try {
          let substrRegex = new RegExp(req.query.search, 'i');

          members = members.filter((member) => {
            return substrRegex.test(member.username);
          });
        } catch (err) {}

	      console.log('MEMBERS SEARCHED');
      }

      if (req.query.include?.includes('birdData')) {
        for (let member of members) {
          promises.push(new Bird(req.query.bird).fetchMemberData(member.id).then((data) => {
            member.owned = data.owned;
            member.wishlisted = data.wishlisted;
          }));
        }

	      console.log('BIRD DATA');
      }

      await Promise.all(promises);
	    console.log('FETCHED');

      return res.json(members);
    });
  }
};
