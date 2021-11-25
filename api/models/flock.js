const Cache = require('../helpers/cache.js');
const Redis = require('../helpers/redis.js');

class Flock {
  constructor(id) {
    this.id = id;
    this.schema = {};
  }

  fetch(params) {
    return new Promise((resolve, reject) => {
      Cache.get('flock', this.id).then(async (flock) => {
        if (!flock) {
          resolve(null);
        } else {

          this.name = flock.name;
          this.description = flock.description;

          resolve(this);
        }
      });
    });
  }
}

module.exports = Flock;
