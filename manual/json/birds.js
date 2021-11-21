const csv = require('csv-parser');
const https = require('https');
const fs = require('fs');

const {
  Datastore
} = require('@google-cloud/datastore');

const DB = new Datastore({
  namespace: 'squawkoverflow'
});

var output = [];

// Clements, J. F., T. S. Schulenberg, M. J. Iliff, S. M. Billerman, T. A. Fredericks, J. A. Gerbracht, D. Lepage, B. L. Sullivan, and C. L. Wood. 2021.
// The eBird/Clements checklist of Birds of the World: v2021.
// Downloaded from https://www.birds.cornell.edu/clementschecklist/download/

https.get('https://www.birds.cornell.edu/clementschecklist/wp-content/uploads/2021/08/eBird_Taxonomy_v2021.csv', (res) => {
  res
    .pipe(csv())
    .on('data', (row) => {
      if (row['CATEGORY'] == 'species') {
        var order = row['ORDER1']
        var family = row['FAMILY'].split(' ').shift();

	      output.push({
          "commonName": row['PRIMARY_COM_NAME'],
          "scientificName": row['SCI_NAME'],
          "speciesCode": row['SPECIES_CODE'],
          "family": family,
          "order": order
        });
      }
    })
    .on('end', async () => {
			    for (var bird of output) {
				    console.log(bird);
				    await DB.runQuery(DB.createQuery('Bird').filter('code', '=', bird.speciesCode)).then( ([results]) => {
					    bird.adjectives = results[0].adjectives || [];
				    });
			    }

      fs.writeFileSync(__dirname + '/birds.json', JSON.stringify(output));
    });
});
