const Redis = require('../helpers/redis.js');
const BirdyPets = require('../helpers/birdypets.js');
const birds = require('../helpers/birds.js');

Redis.scan('memberpet').then((results) => {
	console.log("it begins");
  for (var result of results) {
    var birdypet = BirdyPets.get(result.birdypetId);

    if (!birdypet) {
      oldpet = BirdyPets.findBy('oldId', result.birdypetId);

      if (oldpet.length > 0) {
	      console.log("save");
        Redis.set('memberpet', result._id, {
          birdypetId: oldpet[0].id
        });
      } else {
        console.log(result);
        throw err;
      }
    }
	  else {
		  console.log("skip");
	  }
  }
});
