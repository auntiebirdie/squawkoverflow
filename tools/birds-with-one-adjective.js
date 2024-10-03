const Database = require('../helpers/database.js');

(async () => {
  // Find birds with only one adjective.
  let birds = await Database.query('SELECT species, COUNT(*) AS count FROM species_adjectives WHERE adjective NOT IN ("foolish") GROUP BY species HAVING count = 1');

  for (let bird of birds) {
    console.log(bird.species);
  }

  process.exit(0);
})();
