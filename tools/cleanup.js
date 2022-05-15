var Database = require('../api/helpers/database.js');

(async () => {
	var promises = [];

  await Database.query('DROP TRIGGER IF EXISTS squawk_birdypets_update');

  var birdypets = await Database.query('SELECT birdypets.id FROM birdypets JOIN variants AS original ON (birdypets.variant = original.id) WHERE original.source = "n/a" AND original.species IN (SELECT species FROM variants WHERE species = original.species AND id != original.id) AND original.species IN (SELECT id FROM species WHERE family LIKE ?)', [process.argv[2] + '%']);

  for (let birdypet of birdypets) {
    console.log('Migrating ' + birdypet.id);
    promises.push(Database.query('UPDATE birdypets JOIN variants AS original ON (birdypets.variant = original.id) SET variant = COALESCE((SELECT id FROM variants WHERE species = original.species LIMIT 1), birdypets.variant) WHERE birdypets.id = ?', [birdypet.id]));

    if (promises.length > 500) {
      await Promise.all(promises);

      promises = [];
    }
  }

  var duplicates = await Database.query('SELECT id FROM variants AS original WHERE source = "n/a" AND species IN (SELECT species FROM variants WHERE id != original.id AND source = "n/a") AND id NOT IN (SELECT variant FROM birdypets);');

  for (let variant of duplicates) {
    console.log('Removing ' + variant.id);
    promises.push(Database.query('DELETE FROM variants WHERE id = ?', [variant.id]));

    if (promises.length > 500) {
      await Promise.all(promises);

      promises = [];
    }
  }

  await Promise.all(promises);

  process.exit(0);
})();
