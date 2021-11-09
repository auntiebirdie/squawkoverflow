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
        prefix: birdypet.prefix,
        alias: birdypet.alias,
        illustration: birdypet.url,
        speciesCode: birdypet.speciesCode,
        label: birdypet.label,
        credit: birdypet.credit,
        source: birdypet.source,
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
