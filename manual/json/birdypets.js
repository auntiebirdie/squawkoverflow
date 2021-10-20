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
        illustration: birdypet.illustration,
        speciesCode: birdypet.speciesCode,
        version: birdypet.version,
        label: birdypet.label,
        special: birdypet.special || false,
        filetype: birdypet.filetype || "jpg"
      });
    }

    fs.writeFileSync(__dirname + '/../../public/data/birdypets.json', JSON.stringify([...output], null, 2));

    process.exit(0);
  } catch (err) {
    console.log(err);
  }
})();