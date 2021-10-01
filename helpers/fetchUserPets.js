var Redis = require('./redis.js');

module.exports = function(filters) {
  var birdypets = require('../public/data/birdypets.json');

  return new Promise((resolve, reject) => {
    Redis.fetch({
      "kind": "memberpet",
      "filters": filters
    }).then((userpets) => {
      return userpets.map((userpet) => {
        let birdypet = birdypets.find((birdypet) => birdypet.id == userpet.birdypetId);

        return {
          ...userpet,
          ...{
            birdypet: birdypet,
            flocks: userpet.flocks ? userpet.flocks.split(',') : []
          }
        }
      }).sort((a, b) => {
        return b.hatchedAt - a.hatchedAt;
      });
    }).then( (userpets) => {
	    resolve(userpets);
    });
  });
}
