var Database = require('../api/helpers/database.js');

(async () => {
  var members = await Database.query('SELECT id FROM members');
  var adjectives = await Database.query('SELECT adjective FROM adjectives');
  var promises = [];


  for (let member of members) {
    for (let adjective of adjectives) {
      promises.push(new Promise(async (resolve, reject) => {
        var total = await Database.count('counters', {
          member: member.id,
          type: 'birdypedia',
          count: {
            comparator: '>',
            value_trusted: 0
          },
          id: {
            comparator: 'IN',
            value_trusted: '(SELECT species FROM species_adjectives WHERE adjective = ?)',
            value: adjective.adjective
          }
        });

        await Database.set('counters', {
          member: member.id,
          type: 'eggs',
          id: adjective.adjective
        }, {
          count: total
        });

        resolve();
      }));

      if (promises.length > 250) {
        console.log('Clearing promises...');
        await Promise.all(promises);

        promises = [];
      }
    }

    console.log('Pausing...');
    await new Promise((resolve, reject) => {
      setTimeout(resolve, 5000);
    });
  }

  await Promise.all(promises);

  process.exit(0);
})();