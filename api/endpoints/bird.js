const Bird = require('../models/bird.js');
const Counters = require('../helpers/counters.js');
const Members = require('../collections/members.js');

module.exports = async (req, res) => {
  var bird = new Bird(req.query.speciesCode);

  await bird.fetch({
	  include: ['variants', 'memberData'],
	  member: req.query.loggedInUser
  });

  if (req.query.include?.includes('members')) {
    let promises = [];
    await Members.all().then((members) => {
      for (let member of members) {
        if (!member.settings?.privacy?.includes('profile')) {
          promises.push(Counters.get('species', member.id, bird.code).then((result) => {
            return {
              member: member,
              count: result
            }
          }));
        }
      }
    });

    await Promise.all(promises).then((responses) => {
      bird.members = responses.filter((response) => response.count > 0).map((response) => response.member);
    });
  }

  res.json(bird);
}
