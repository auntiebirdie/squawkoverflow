const {
  Datastore
} = require('@google-cloud/datastore');

const DB = new Datastore({
  namespace: 'squawkoverflow'
});

const opengraph = require('open-graph');
const helpers = require('../../helpers.js');

(async () => {
  try {
    var birds = helpers.Birds.all();

        for (let bird of birds) {
          await new Promise((resolve, reject) => {
            opengraph(`https://ebird.org/species/${bird.speciesCode}`, (err, meta) => {
              console.log(meta);
              resolve();
            });

          });
    }
  } catch (err) {
    console.log(err);
  }
})();
