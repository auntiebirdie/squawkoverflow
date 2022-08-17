const xlsx = require('xlsx');
const https = require('https');
const mariadb = require('mariadb');
const secrets = require('../secrets.json');

(async () => {
  let orders = [];
  let families = [];
  let promises = [];
  let total = 0;

  const conn = await mariadb.createConnection({
    host: secrets.DB.HOST,
    user: secrets.DB.USER,
    password: secrets.DB.PASS
  });

  const createSpecies = require('../api/bird.js');

  let existingSpecies = await conn.query('SELECT id FROM squawkdata.species').then((results) => results.map((result) => result.id));
  let updatedSpecies = [];

  const request = https.get('https://worldbirdnames.org/Multiling%20IOC%2012.2.xlsx', (response) => {
    const chunks = [];

    response.on('data', (chunk) => chunks.push(Buffer.from(chunk)));
    response.on('end', async () => {
      const excel = xlsx.read(Buffer.concat(chunks));
      const data = xlsx.utils.sheet_to_json(excel.Sheets['List']);

      const id = Object.keys(data[0])[3];

      for (let row of data) {
        let order = row['Order'].slice(0, 1).toUpperCase() + row['Order'].slice(1).toLowerCase();
        let family = row['Family'];

        if (!orders.includes(order)) {
          let orderCheck = await conn.query('SELECT * from squawkdata.taxonomy WHERE name = ? AND type = "order"', [order]);

          if (orderCheck.length == 0) {
            throw `NEW ORDER: ${order}`;
          }

          orders.push(order);
        }

        if (!families.includes(family)) {
          let familyCheck = await conn.query('SELECT * FROM squawkdata.taxonomy WHERE name = ? AND type = "family"', [family])

          if (familyCheck.length == 0) {
            throw `NEW FAMILY: ${family}`;
          } else if (familyCheck[0].parent != order) {
            console.log(`FAMILY CHANGED: ${family}   ${familyCheck[0].parent} -> ${order}`);
          }

          families.push(family);
        }

        let species = await conn.query('SELECT * FROM squawkdata.species WHERE id = ? OR commonName = ?', [row[id], row['English']]);

        if (species.length > 0) {
          species = species[0];

          let url = `https://squawkoverflow.com/birdypedia/bird/${species.id.replace(/\s/g, '-')}/edit`;

          if (species.id != row[id]) {
            console.log('CHANGE', `${species.id} -> ${row[id]}`, url);
          }
          if (species.commonName != row['English']) {

            console.log('CHANGE', `${species.commonName} -> ${row['English']}`, url);
          }
          if (species.family != family) {


            console.log('CHANGE', `${species.family} -> ${family}`, url);
          }

          updatedSpecies.push(species.id);
        } else {
          console.log('NEW', family, row[id], row['English']);
        }
      }

      let missingSpecies = existingSpecies.filter((species) => !updatedSpecies.includes(species));

      console.log('*** MISSING ***');
      console.log(missingSpecies);
    });
  });
})();
