// Clements, J. F., T. S. Schulenberg, M. J. Iliff, S. M. Billerman, T. A. Fredericks, J. A. Gerbracht, D. Lepage, B. L. Sullivan, and C. L. Wood. 2021. 
// The eBird/Clements Checklist of Birds of the World: v2021.
// Downloaded from https://www.birds.cornell.edu/clementschecklist/download/ 

const csv = require('csv-parser');
const https = require('https');
const mariadb = require('mariadb');
const secrets = require('../api/secrets.json');

(async () => {
  let ENV = process.env.NODE_ENV ? 'PROD' : 'DEV';
  let orders = [];
  let families = [];
  let promises = [];
  let total = 0;

  const conn = await mariadb.createConnection({
    host: secrets.DB[ENV].HOST,
    user: secrets.DB[ENV].USER,
    password: secrets.DB[ENV].PASS
  });

	let existingSpecies = await conn.query('SELECT code FROM squawkdata.species').then( (results) => results.map((result) => result.code));
	let updatedSpecies = [];

  const request = https.get('https://www.birds.cornell.edu/clementschecklist/wp-content/uploads/2021/08/eBird_Taxonomy_v2021.csv', (response) => {
    response.pipe(csv())
      .on('data', async (row) => {
        if (row['CATEGORY'] == 'species') {
          var order = row['ORDER1']
          var family = row['FAMILY'].split(' ').shift();

          if (!orders.includes(order)) {
            conn.query('INSERT INTO squawkdata.taxonomy VALUES (?, NULL, "order", NULL) ON DUPLICATE KEY UPDATE type=?', [order, "order"]);
            orders.push(order);
          }

          if (!families.includes(family)) {
            conn.query('INSERT INTO squawkdata.taxonomy VALUES (?, ?, "family", ?) ON DUPLICATE KEY UPDATE display = ?, parent = ?', [family, row['FAMILY'], order, row['FAMILY'], order]);
            families.push(family);
          }

          conn.query('INSERT INTO squawkdata.species VALUES (?, ?, ?, ?) ON DUPLICATE KEY UPDATE taxonomy = ?, commonName = ?, scientificName = ?', [row['SPECIES_CODE'], family, row['PRIMARY_COM_NAME'], row['SCI_NAME'], family, row['PRIMARY_COM_NAME'], row['SCI_NAME']]);

		updatedSpecies.push(row['SPECIES_CODE']);
        }
      })
      .on('end', async () => {
        let specials = [
          ['chickn', 'Phasianidae', 'Chicken', 'Gallus gallus domesticus', 'Phasianidae', 'Chicken', 'Gallus gallus domesticus']
        ];

        for (let special of specials) {
          conn.query('INSERT INTO squawkdata.species VALUES (?, ?, ?, ?) ON DUPLICATE KEY UPDATE taxonomy = ?, commonName = ?, scientificName = ?', special);
		updatedSpecies.push(special[0]);
        }

	      let missingSpecies = existingSpecies.filter((species) => !updatedSpecies.includes(species));
	      let newSpecies = updatedSpecies.filter((species) => !existingSpecies.includes(species));

	      console.log('*** MISSING ***');
	      console.log(missingSpecies);

		      console.log('*** NEW ***');
		      console.log(newSpecies);

        process.exit(0);
      });
  });
})();
