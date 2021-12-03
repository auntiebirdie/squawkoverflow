const Birds = require('../collections/birds.js');
const BirdyPets = require('../collections/birdypets.js');
const Counters = require('../helpers/counters.js');
const Members = require('../collections/members.js');

module.exports = async (req, res) => {
  var bird = Birds.findBy('speciesCode', req.query.speciesCode);
  var variants = await BirdyPets('speciesCode', req.query.speciesCode);

  if (req.query.loggedInUser) {
    await Promise.all(variants.map((variant) => variant.fetchMemberData(req.query.loggedInUser)));
  }

  if (req.query.include?.includes('members')) {
    let promises = [];
    await Members.all().then((members) => {
      for (let member of members) {
        if (!member.settings?.privacy?.includes('profile')) {
          promises.push(Counters.get('species', member.id, bird.speciesCode).then((result) => {
            return {
              member: member,
              count: result
            }
          }));
        }
      }
    });

    await Promise.all(promises).then((responses) => {
      bird.members = responses.filter( (response) => response.count > 0).map( (response) => response.member);
    });
  }

  variants.forEach((variant) => delete variant.species);

  bird.variants = variants;

  res.json(bird);
}
