var Database = require('../helpers/database.js');

(async () => {
  var members = await Database.query('SELECT id FROM members');
	var totalBirds = await Database.count('species');
  var promises = [];


  for (let member of members) {
      promises.push(new Promise(async (resolve, reject) => {

	      let memberBirds = await Database.count('member_unlocks JOIN species ON (member_unlocks.species = species.id)', { member :member.id });

	            let percentageBirds = memberBirds / totalBirds;
      let newTitle = 0;

      if (percentageBirds >= 1) {
        newTitle = 4;
      } else if (percentageBirds >= .75) {
        newTitle = 3;
      } else if (percentageBirds >= .50) {
        newTitle = 2;
      } else if (percentageBirds >= .25) {
        newTitle = 1;
      }

	      console.log(member.id, percentageBirds, newTitle);

      if (newTitle) {
	      for (let i = 1; i <= newTitle; i++) {
        Database.query('INSERT IGNORE INTO member_titles VALUES (?, ?)', [member.id, i]);
	      }
      }

        resolve();
      }));

      if (promises.length > 250) {
        console.log('Clearing promises...');
        await Promise.all(promises);

        promises = [];
      }
  }

  await Promise.all(promises);

  process.exit(0);
})();
