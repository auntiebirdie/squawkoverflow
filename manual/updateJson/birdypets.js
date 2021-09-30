const fs = require('fs');

const {
  Datastore
} = require('@google-cloud/datastore');

const DB = new Datastore({
  namespace: 'squawkoverflow'
});

(async () => {
  try {
    var output = [];
    var birds = await DB.runQuery(DB.createQuery('Bird').filter('type', '=', 'species')).then(([birds]) => {
      var birdData = {};

      for (var bird of birds) {
        if (bird.adjectives) {
          birdData[bird.code] = bird.adjectives;
        }
      }

      return birdData;
    });

    var [birdypets] = await DB.runQuery(DB.createQuery('Illustration'));

    for (var birdypet of birdypets) {
      output.push({
        id: birdypet[Datastore.KEY].name,
        adjectives: birds[birdypet.species.speciesCode],
        illustration: birdypet.illustration,
        species: birdypet.species,
        version: birdypet.version,
        label: birdypet.label
      });
    }

    fs.writeFileSync(__dirname + '/../../public/data/birdypets.json', JSON.stringify([...output], null, 2));
  } catch (err) {
    console.log(err);
  }
})();
