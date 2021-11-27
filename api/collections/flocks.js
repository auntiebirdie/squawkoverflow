const Cache = require('../helpers/cache.js');
const Redis = require('../helpers/redis.js');

class Flocks {
  constructor() {
  }

  all(member) {
    return new Promise((resolve, reject) => {
      Redis.fetch('flock', {
        "FILTER": `@member:{${member}}`,
        "SORTBY": ["displayOrder", "ASC"]
      }).then( (flocks) => {
	      return flocks.results;
      });
    });
  }
}

module.exports = Flocks;
