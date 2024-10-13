const Database = require('../helpers/database.js');

(async () => {
	let alphabet = ["L"]; //"ABCDEFGHIJKLMNOPQRSTUVWXYZ".split('');

  for (let alpha of alphabet) {
	  let eggs = await Database.query('SELECT adjective FROM adjectives WHERE adjective LIKE ?', [`${alpha}%`]);

	  for (let egg of eggs) {
		  console.log(`Updating ${egg.adjective}...`);
    	await Database.query('UPDATE adjectives SET numSpecies = (SELECT COUNT(*) FROM species_adjectives WHERE adjective = ?) WHERE adjective = ?', [egg.adjective, egg.adjective]);
	  }
  }
	process.exit(0);
})();
