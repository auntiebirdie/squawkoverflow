const BirdyPet = require('../models/birdypet.js');
const Cache = require('../helpers/cache.js');
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

    if (member.flock) {
      promises.push(Search.get('BirdyPet', {
        member: member.id,
        page: 1,
        sort: 'hatchedAt',
        family: '',
        flock: member.flock
      }));
    }

    await Cache.get('aviary', member.id).then(async (results) => {
      var start = 0;
      var end = results.length;

      do {
        let promises = [];

        for (let i = start, len = Math.min(start + 250, end); i < len; i++, start++) {
          let birdypet = new BirdyPet(results[i]);

          promises.push(birdypet.fetch());
        }

        await Promise.all(promises).then((birdypets) => {
          let promises = [];

          for (let birdypet of birdypets) {
            promises.push(Counters.refresh('birdypets', member.id, birdypet.illustration.id));
          }

          return Promise.all(promises);
        });

        promises = [];
      }
      while (start < end);

      return true;
    });

    promises.push(member.set({
      lastRefresh: Date.now()
    }));

    await Promise.all(promises);

    console.log("DONE!");

    return res.sendStatus(200);
  });
};
