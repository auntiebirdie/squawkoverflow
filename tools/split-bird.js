const Database = require('../helpers/database.js');

(async () => {
  let _OLD = 'Eclectus roratus';
  let _NEW = 'Eclectus polychloros';

  await Database.query('UPDATE variants SET species = ?, subspecies = "" WHERE species = ? and subspecies = ?', [_NEW, _OLD, _NEW.split(' ').pop()]);
  await Database.query('INSERT INTO species_adjectives (SELECT ?, adjective FROM species_adjectives WHERE species = ?)', [_NEW, _OLD]);

  process.exit(0);
})();
