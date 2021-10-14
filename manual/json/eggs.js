const {
  Datastore
} = require('@google-cloud/datastore');

const DB = new Datastore({
  namespace: 'squawkoverflow'
});

const fs = require('fs');

(async () => {
  try {
    var output = [];

    await DB.runQuery(DB.createQuery(['Bird']).filter('type', '=', 'species')).then(([birds]) => {
      return birds.map((bird) => {
        output = [...new Set([...output, ...bird.adjectives])];

        return bird;
      });
    });

    output = output.sort((a, b) => a.localeCompare(b));

    fs.writeFileSync(__dirname + '/../../public/data/eggs.json', JSON.stringify([...output], null, 2));
  } catch (err) {
    console.log(err);
  }
})();
