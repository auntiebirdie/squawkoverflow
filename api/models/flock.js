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
      Database.create('flocks', {
        id: Database.key(),
        name: data.name || "",
        description: data.description || "",
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
      Database.getOne('flocks', {
        id: this.id
      }).then(async (flock) => {
        if (!flock) {
          resolve(null);
        } else {
          this.name = flock.name;
          this.description = flock.description;
          this.member = flock.member;
          this.displayOrder = flock.displayOrder;

          this.families = await Database.query(`
	  SELECT DISTINCT species.family
	  FROM birdypets
	  JOIN variants ON (birdypets.variant = variants.id)
	  JOIN species ON (variants.species = species.code)
	  JOIN birdypet_flocks ON (birdypets.id = birdypet_flocks.birdypet)
	  WHERE birdypet_flocks.flock = ?
	  `, [this.id]).then((results) => results.map((result) => result.family));

          resolve(this);
        }
      });
    });
  }

  set(data = {}) {
    return new Promise(async (resolve, reject) => {
      for (let key in data) {
        if (typeof this.constructor.schema[key] == "undefined" || typeof data[key] == "undefined") {
          delete data[key];
        }
      }

      await Database.set('flocks', {
        id: this.id
      }, data);

      resolve();
    });
  }

  delete() {
    return new Promise((resolve, reject) => {
      Database.delete('flocks', {
        id: this.id
      }).then(() => {

        resolve();
      });
    });
  }
}

module.exports = Flock;
