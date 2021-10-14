const csv = require('csv-parser');
const https = require('https');
const fs = require('fs');
const birdypets = require('../../helpers/birdypets.js');

var output = {};

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
	var adjectives = birdypets.findBy('species.speciesCode', row['SPECIES_CODE'])[0]?.adjectives || [];

        if (!output[order]) {
          output[order] = {}
        }

        if (!output[order][family]) {
          output[order][family] = {
            display: row['FAMILY'],
            children: []
          };
        }

        output[order][family].children.push({
          "commonName": row['PRIMARY_COM_NAME'],
          "scientificName": row['SCI_NAME'],
          "speciesCode": row['SPECIES_CODE'],
          "family": family,
          "order": order,
          "adjectives": adjectives
        });
      }
    })
    .on('end', () => {
      fs.writeFileSync(__dirname + '/../../public/data/birds.json', JSON.stringify(output));
    });
});
