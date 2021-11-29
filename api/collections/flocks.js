const Redis = require('../helpers/redis.js');

class Flocks {
  constructor() {
    this.model = require('../models/flock.js');
  }

  get(id, data = {}) {
    let Flock = new this.model(id, data);

    return Flock;
  }

  all(member) {
    return new Promise((resolve, reject) => {
      Redis.fetch('flock', {
        "FILTER": `@member:{${member}}`,
        "SORTBY": ["displayOrder", "ASC"]
      }).then((response) => {
        resolve(response.results.map((flock) => this.get(flock._id, flock)));
      });
    });
  }
}

module.exports = new Flocks;
