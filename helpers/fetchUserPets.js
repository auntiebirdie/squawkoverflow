var Redis = require('./redis.js');
var BirdyPets = require('./birdypets.js');

module.exports = function(filters) {
  return new Promise((resolve, reject) => {
    Redis.fetch({
      "kind": "memberpet",
      "filters": filters
    }).then((userpets) => {
      return userpets.map((userpet) => {
        let birdypet = BirdyPets.fetch(userpet.birdypetId);

        return {
          ...userpet,
          birdypet: birdypet,
          flocks: userpet.flocks ? userpet.flocks.split(',') : []
        }
      }).sort((a, b) => {
        return b.hatchedAt - a.hatchedAt;
      });
    }).then( (userpets) => {
	    resolve(userpets);
    });
  });
}
