const Cache = require('../helpers/cache.js');
const Database = require('../helpers/database.js');

class Flock {
  static schema = {
    name: String,
    description: String,
    displayOrder: Number
  }

  constructor(id) {
    this.id = id;
  }

  create(data) {
    return new Promise((resolve, reject) => {
      Database.create('flock', {
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

          this.families = await Database.query(`
	  SELECT DISTINCT species.taxonomy
	  FROM birdypets
	  JOIN variants ON (birdypets.variant = variants.id)
	  JOIN species ON (variants.species = species.code)
	  JOIN birdypet_flocks ON (birdypets.id = birdypet_flocks.birdypet)
	  WHERE birdypet_flocks.flock = ?
	  `, [this.id]).then((results) => results.map( (result) => result.taxonomy));

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

      await Database.set('flocks', { id : this.id }, data);
      await Cache.refresh('flock', this.id);

      resolve();
    });
  }
}

module.exports = Flock;
