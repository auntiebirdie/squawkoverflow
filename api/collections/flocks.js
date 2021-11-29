const Cache = require('../helpers/cache.js');

class Flocks {
  constructor() {
    this.model = require('../models/flock.js');
  }

  get(id) {
    let Flock = new this.model(id);

    return Flock.fetch();
  }

  all(member) {
    return new Promise((resolve, reject) => {
      Cache.get('flocks', member, 's').then((ids) => {
        Promise.all(ids.map((id) => this.get(id))).then((flocks) => {
          resolve(flocks.sort((a, b) => a.displayOrder - b.displayOrder));
        });
      });
    });
  }
}

module.exports = new Flocks;
