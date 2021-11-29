const Database = require('../../helpers/database.js');
const Redis = require('../../helpers/redis.js');

Redis.scan('flock').then(async (results) => {
  var started = true;

  for (var result of results) {
    //if (result._id == "vS5rCuWHof5H78iibzrB7h") {
    //		started = true;
    //	}

    if (started) {
      console.log(`Saving ${result._id}`);
      await Database.save('Flock', result._id, {
        member: result.member,
        name: result.name,
        description: result.description,
        displayOrder: result.displayOrder
      });
    }
  }

  process.exit(0);
});