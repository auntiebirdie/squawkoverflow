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

    var [birdypets] = await DB.runQuery(DB.createQuery('Illustration'));

    for (var birdypet of birdypets) {
      output.push({
        id: birdypet[Datastore.KEY].name,
	image: '',
        original: birdypet.illustration,
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
