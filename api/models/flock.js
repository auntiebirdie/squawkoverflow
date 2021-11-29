const Cache = require('../helpers/cache.js');
const Redis = require('../helpers/redis.js');

class Flock {
  static schema = {
    name: String,
    description: String,
    displayOrder: Number
  }

  constructor(id, data = {}) {
    this.id = id;

    for (let key in data) {
      if (typeof this.constructor.schema[key] != "undefined") {
        this[key] = data[key];
      }
    }
  }

  create(data) {
    return new Promise((resolve, reject) => {
      Redis.create('flock', {
        name: data.name,
        description: data.description,
        displayOrder: 100,
        member: data.member
      }).then((id) => {
        this.id = id;

        resolve();
      });
    });
  }

  fetch(params = {}) {
    return new Promise((resolve, reject) => {
      Cache.get('flock', this.id).then(async (flock) => {
        if (!flock) {
          resolve(null);
        } else {
          this.name = flock.name;
          this.description = flock.description;
          this.member = flock.member;
          this.displayOrder = flock.displayOrder;

          if (params.include?.includes('families')) {
            var totals = await Cache.get('flockTotals', this.id);

            this.families = Object.keys(totals).filter((key) => totals[key] > 0 && !key.startsWith('_'));
          }

          resolve(this);
        }
      });
    });
  }

  set(data = {}) {
    return new Promise(async (resolve, reject) => {
      for (let key in data) {
        if (typeof this.constructor.schema[key] == "undefined") {
          delete data[key];
        }
      }

      await Redis.set('flock', this.id, data);
      await Cache.refresh('flock', this.id);

      resolve();
    });
  }
}

module.exports = Flock;
