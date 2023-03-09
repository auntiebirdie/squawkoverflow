const Database = require('../helpers/database.js');
const xlsx = require('xlsx');

const workbook = xlsx.readFile('Multiling IOC 13.1_b.xlsx');
const IOC = xlsx.utils.sheet_to_json(workbook.Sheets['List']);

(async () => {
  for (let row of IOC) {
	  let _ID = row['IOC_13.1'];
	  let _NAME = row['English name'];

	  let bird = await Database.query('SELECT DISTINCT id, commonName FROM species JOIN species_names ON (species.id = species_names.species) WHERE species.id = ? OR species.commonName = ? OR (species_names.name = ? AND species_names.lang = "zz") LIMIT 1',
            [_ID, _NAME, _ID]
	  );

	  if (!bird) {
	    console.log(row);
	    process.exit(0);
	  }
	  else {
		  if (bird.id != _ID) {
			  console.log(bird);
			  console.log(`CHANGE ID ${bird.id} TO ${_ID}`);
			  process.exit(0);
		  }
	  }
  }
})();

/*
sudo mysql squawkdata -e "SELECT id, family, commonName, (SELECT name FROM species_names WHERE species = species.id AND lang = \"en\" AND name != species.commonName LIMIT 1) otherName FROM species" > species.csv
gsutil cp species.csv gs://squawkoverflow
*/
