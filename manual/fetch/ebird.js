const {
  Datastore
} = require('@google-cloud/datastore');

const DB = new Datastore({
  namespace: 'squawkoverflow'
});

const opengraph = require('open-graph');

(async () => {
  try {
    var birds = require('../public/data/birds.json');

    for (let order in birds) {
      for (let family in birds[order]) {
        for (let bird of birds[order][family].children) {
          await new Promise((resolve, reject) => {
opengraph(`https://ebird.org/species/${bird.speciesCode}`, (err, meta) => {
console.log(meta); resolve();
});

          });

          return false;
        }
        return false;
      }
      return false;
    }
  } catch (err) {
    console.log(err);
  }
})();
