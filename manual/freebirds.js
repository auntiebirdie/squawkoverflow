const Redis = require('../helpers/redis.js');
const BirdyPets = require('../helpers/birdypets.js');

Redis.get('cache', 'freebirds').then(async (results) => {
  for (var result of results) {
	  var birdypet = BirdyPets.findBy('alias', result);

	  if (birdypet.length > 0) {
		  await Redis.pop('cache', 'freebirds', result);
		  await Redis.push('cache', 'freebirds', birdypet[0].id);
	  }
  }
});
