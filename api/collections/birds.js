const Database = require('../helpers/database.js');

class Birds {
  constructor() {
    this.model = require('../models/bird.js');
  }

  findBy(key, value) {
    return new Promise((resolve, reject) => {
      let query = {};

      query[key] = value;

      Database.getOne('species', query, {
        select: ['code']
      }).then((bird) => {
        resolve(new this.model(bird.code));
      });
    });
  }

  fetch(key, value) {
    return new Promise((resolve, reject) => {
      let query = {};

      if (key == '*') {
        Database.query('SELECT species.*, taxonomy.parent AS `order` FROM species JOIN taxonomy ON (taxonomy.name = species.family) WHERE commonName LIKE ? OR scientificName LIKE ? OR family LIKE ? or parent LIKE ?',
          Array(4).fill(`%${value}%`)
        ).then((birds) => {
          resolve(birds);
        });
      } else {
        query[key] = value;

        Database.get('species', query, {
          select: ['code']
        }).then((birds) => {
          resolve(birds);
        });
      }
    });
  }

  random(key, value) {
    return new Promise(async (resolve, reject) => {
      var matchingBirds = key && value ? await this.fetch(key, value) : [];

      resolve((matchingBirds.length > 0 ? matchingBirds : await this.all()).sort(() => .5 - Math.random())[0]);
    });
  }

  all() {
    return new Promise((resolve, reject) => {
      Database.get('species').then((birds) => {
        resolve(birds);
      });
    });
  }
}

module.exports = new Birds;
