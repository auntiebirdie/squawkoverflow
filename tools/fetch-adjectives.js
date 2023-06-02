const Database = require('../helpers/database.js');
const ogs = require('open-graph-scraper');

(async () => {
  let bird = await Database.query('SELECT code FROM species WHERE id = ? LIMIT 1', [process.argv[2] + " " + process.argv[3]]);

  if (bird) {
	  ogs({ url : 'https://ebird.org/species/rehwea3' }).then((data) => {
		  console.log(data);
	  }).catch((err) => {
	    console.log(err);
    });
  } else {
    console.log(`https://squawkoverflow.com/birdypedia/bird/${process.argv[2]}s-${process.argv[3]}/edit`);
    process.exit(0);
  }
})();
