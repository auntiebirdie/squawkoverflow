const Database = require('../helpers/database.js');
const Redis = require('../helpers/redis.js');
const xlsx = require('xlsx');

const workbook = xlsx.readFile('Multiling IOC 13.1_c.xlsx');
const IOC = xlsx.utils.sheet_to_json(workbook.Sheets['List']);

(async () => {
  let iocBirds = [];

  for (let row of IOC) {
    console.log(row['Seq.']);

    let _ID = row['IOC_13.1'];
    let _NAME = row['English name'];

    let bird = await Database.query('SELECT DISTINCT id, commonName FROM species JOIN species_names ON (species.id = species_names.species) WHERE species.id = ? OR species.commonName = ? OR (species_names.name = ? AND species_names.lang = "zz") LIMIT 1',
      [_ID, _NAME, _ID]
    );

    iocBirds.push(_ID);

    if (!bird) {
      console.log("Adding new bird...");
      await Database.query('INSERT INTO species VALUES (?, NULL, ?, ?, ?)', [_ID, row['Family'], row['English name'], _ID]);
      await Database.query('INSERT INTO variants VALUES (?, ?, "", "", "n/a", "n/a", 0, NULL, NULL, -1, NULL, NULL, NOW(), NOW())', [Database.key(), _ID]);
      await Database.query('INSERT INTO species_adjectives VALUES (?, "new")', [_ID]);
      await Database.query('INSERT INTO species_names VALUES (?, ?, "en")', [_ID, row['English name']]);
      await Database.query('INSERT INTO species_names VALUES (?, ?, "zz")', [_ID, _ID]);
    } else {
      if (bird.id != _ID) {
        console.log("Updating existing bird (scientific name)...");
        await Database.query('UPDATE counters SET id = ? WHERE id = ?', [_ID, bird.id]);
        await Database.query('UPDATE member_unlocks SET species = ? WHERE species = ?', [_ID, bird.id]);
        await Database.query('UPDATE variants SET species = ? WHERE species = ?', [_ID, bird.id]);
        await Database.query('UPDATE species_adjectives SET species = ? WHERE species = ?', [_ID, bird.id]);
        await Database.query('UPDATE wishlist SET species = ? WHERE species = ?', [_ID, bird.id]);
        await Database.query('INSERT IGNORE INTO species_names VALUES (?, ?, "zz")', [_ID, bird.id]);
        await Database.query('UPDATE species SET id = ?, scientificName = ? WHERE id = ?', [_ID, _ID, bird.id]);
      }

      if (bird.commonName != _NAME) {
        let isLocalized = await Database.query('SELECT COUNT(*) total FROM species_names WHERE species = ? AND name = ? LIMIT 1', [_ID, row['English name']]);


        if (isLocalized.total == 0) {
          console.log("Updating existing bird (common name)...");

          await Database.query('INSERT IGNORE INTO species_names VALUES (?, ?, "en")', [_ID, bird.commonName]);
          await Database.query('INSERT IGNORE INTO species_names VALUES (?, ?, "en")', [_ID, row['English name']]);
          await Database.query('UPDATE species SET commonName = ? WHERE id = ?', [row['English name'], _ID]);
        }
      }
    }
  }

  let squawkBirds = await Database.query('SELECT id, commonName FROM species');
  let extinctBirds = ["Alectroenas payandeei", "Amazona martinicana", "Archaeopteryx lithographica", "Psittacosaurus mongoliensis", "Amazona violacea", "Aplonis ulietensis", "Foudia delloni", "Nesoenas cicur", "Nesoenas duboisi", "Tribonyx hodgenorum", "Porphyrio caerulescens", "Porphyrio kukwiedei", "Porphyrio paepae", "Psittacara labati", "Tribonyx hodgenorum", "Chenonetta finschi", "Columba thiriouxi"];
  let domesticBirds = ["Anas platyrhynchos domesticus", "Columba livia domestica", "Gallus gallus domesticus", "Serinus canaria domesticus"];
  let hybridBirds = ["Craspedophora duivenbodei", "Parotia duivenbodei"];

  for (let bird of squawkBirds) {
    if (!iocBirds.includes(bird.id) && !extinctBirds.includes(bird.id) && !domesticBirds.includes(bird.id) && !hybridBirds.includes(bird.id)) {
      console.log(bird);
    }
  }

  Redis.sendCommand(['FLUSHDB']).then((results) => {
    process.exit(0);
  });
})();
