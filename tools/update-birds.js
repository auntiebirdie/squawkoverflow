const xlsx = require('xlsx');
const https = require('https');
const mariadb = require('mariadb');
const secrets = require('../secrets.json');

(async () => {
  let orders = [];
  let families = [];

  const conn = await mariadb.createConnection({
    host: secrets.DB.HOST,
    user: secrets.DB.USER,
    password: secrets.DB.PASS
  });

  const createSpecies = require('../api/bird.js');

  let existingSpecies = await conn.query('SELECT id FROM squawkdata.species').then((results) => results.map((result) => result.id));
  let updatedSpecies = [];

  let changelog = {
    orders: [],
    families: {
      'new': [],
      'updated': []
    },
    species: {
      'new': [],
      'updated': []
    }
  };

  const request = https.get('https://worldbirdnames.org/Multiling%20IOC%2012.2.xlsx', (response) => {
    const chunks = [];

    response.on('data', (chunk) => chunks.push(Buffer.from(chunk)));
    response.on('end', async () => {
      const excel = xlsx.read(Buffer.concat(chunks));
      const data = xlsx.utils.sheet_to_json(excel.Sheets['List']);

      const id = Object.keys(data[0])[3];

      for (let row of data) {
        console.log(row['Seq.']);

        let order = row['Order'].slice(0, 1).toUpperCase() + row['Order'].slice(1).toLowerCase();
        let family = row['Family'];

        if (!orders.includes(order)) {
          let orderCheck = await conn.query('SELECT * from squawkdata.taxonomy WHERE name = ? AND type = "order"', [order]);

          if (orderCheck.length == 0) {
            changelog.orders.push(order);
          }

          orders.push(order);
        }

        if (!families.includes(family)) {
          let familyCheck = await conn.query('SELECT * FROM squawkdata.taxonomy WHERE name = ? AND type = "family"', [family])

          if (familyCheck.length == 0) {
            changelog.families['new'].push(family);
          } else if (familyCheck[0].parent != order) {
            changelog.families['updated'].push([family, 'order', familyCheck[0].parent, order]);
          }

          families.push(family);
        }

        let species = await conn.query('SELECT * FROM squawkdata.species WHERE id = ? OR commonName = ? OR id IN (SELECT species FROM squawkdata.species_names WHERE name = ?)', [row[id], row['English'], row['English']]);

        if (species.length > 0) {
          species = species[0];
          let updated = [];

          if (species.id != row[id]) {
            updated.push(['Scientific Name', species.id, row[id]]);
          }
          if (species.commonName != row['English']) {
            updated.push(['Common Name', species.commonName, row['English']]);
          }
          if (species.family != family) {
            updated.push(['Family', species.family, family]);
          }

          if (updated.length > 0) {
            changelog.species['updated'].push(species.id, updated);
          }

          updatedSpecies.push(species.id);
        } else {
          changelog.species['new'].push([row['English'], row[id], family]);
        }
      }

      console.log(changelog);

      if (changelog.families.updated.length > 0) {
        console.log('*** UPDATED FAMILIES ***');

        for (let family of changelog.families.updated) {
          if (family[1] == 'order') {
            console.log(`${family}\r\n - moved from ${family[2]} to ${family[3]}`);
          }
        }
      }

      if (changelog.species.updated.length > 0) {
        console.log('*** UPDATED SPECIES ***');

        for (let species of changelog.species.updated) {
          console.log(`${species[0]}`);

          for (let updated of species[1]) {
            console.log(` - ${updated[0]} changed from ${updated[1]} to ${updated[2]}`);
          }
        }
      }

      let missingSpecies = existingSpecies.filter((species) => !updatedSpecies.includes(species));

      console.log('*** MISSING ***');
      console.log(missingSpecies);
    });
  });
})();
