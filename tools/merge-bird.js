const Database = require('../helpers/database.js');

(async () => {
  let _OLD = 'Cinnyris abbotti';
  let _NEW = 'Cinnyris sovimanga';

  await Database.query('UPDATE variants SET species = ?, subspecies = ? WHERE species = ?', [_NEW, _OLD.split(' ').pop(), _OLD]);
  await Database.query('DELETE FROM wishlist WHERE species = ?', [_OLD]);
  await Database.query('REPLACE INTO counters (SELECT `member`, `type`, ?, MAX(`count`) FROM counters WHERE type = "birdypedia" AND id IN (?, ?) GROUP BY `member`)', [_NEW, _OLD, _NEW]);
  await Database.query('DELETE FROM counters WHERE id = ?', [_OLD]);
  await Database.query('DELETE FROM species_adjectives WHERE species = ?', [_OLD]);
  await Database.query('UPDATE species_names SET species = ? WHERE species = ?', [_NEW, _OLD]);
  await Database.query('DELETE FROM species_names WHERE species = ?', [_OLD]);
  await Database.query('DELETE FROM species WHERE id = ?', [_OLD]);
  await Database.query('UPDATE IGNORE member_unlocks SET species = ? WHERE species = ?', [_NEW, _OLD]);
  await Database.query('DELETE FROM member_unlocks WHERE species = ?', [_OLD]);

  process.exit(0);
})();