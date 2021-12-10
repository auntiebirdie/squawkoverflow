const Counters = require('../helpers/counters.js');
const Members = require('../collections/members.js');
const Search = require('../helpers/search.js');

module.exports = async (req, res) => {
  return new Promise((resolve, reject) => {
    Members.all().then(async (members) => {
      var birds = require('../data/birds.json');
      var eggs = require('../data/eggs.json');

      for (let member of members) {
          if (member.active) {
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

            await Search.invalidate(member.id);

            await Search.get('BirdyPet', {
              member: member.id,
              page: 1,
              sort: 'hatchedAt',
              family: '',
              flock: '',
              search: ''
            });

            await Search.get('BirdyPet', {
              member: member.id,
              page: 1,
              sort: 'commonName',
              family: '',
              flock: '',
              search: ''
            });
          }
      }

      resolve();
    });
  }).then(() => {
    console.log("DONE!");
    return res.sendStatus(200);
  });
};
