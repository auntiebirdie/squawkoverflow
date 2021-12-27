const Counters = require('../helpers/counters.js');
const Members = require('../collections/members.js');
const Search = require('../helpers/search.js');

module.exports = async (req, res) => {
  return new Promise((resolve, reject) => {
    if (req.query.member) {
      resolve(Members.get(req.query.member));
    } else {
      Members.all().then((members) => {
	      // fix to lastRefresh sort ASC
        resolve(members.filter((member) => member.active).sort(() => .5 - Math.random())[0]);
      });
    }
  }).then(async (member) => {
    var birds = require('../data/birds.json');
    var eggs = require('../data/eggs.json');

    let promises = [];
    console.log(`Refreshing cache for ${member.id}`);

    for (let bird of birds) {
      promises.push(Counters.refresh('species', member.id, bird.speciesCode));

      if (promises.length > 250) {
        await Promise.all(promises);
        promises = [];
      }
    }

    await Promise.all(promises);

    promises = [];

    for (let egg in eggs) {
      promises.push(Counters.refresh('eggs', member.id, egg));

      if (promises.length > 250) {
        await Promise.all(promises);
        promises = [];
      }
    }

    await Promise.all(promises);

    promises = [];

    promises.push(Cache.refresh('aviary', member.id));

    promises.push(Search.invalidate(member.id));

    await Promise.all(promises);

    promises = [];

    promises.push(Search.get('BirdyPet', {
      member: member.id,
      page: 1,
      sort: 'hatchedAt',
      family: '',
      flock: '',
      search: ''
    }));

    promises.push(Search.get('BirdyPet', {
      member: member.id,
      page: 1,
      sort: 'commonName',
      family: '',
      flock: '',
      search: ''
    }));

    promises.push(member.set({
      lastRefresh: Date.now()
    }));

    await Promise.all(promises);

    console.log("DONE!");

    return res.sendStatus(200);
  });
};
