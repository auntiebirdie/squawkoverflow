const Database = require('../helpers/database.js');

class Birds {
  constructor() {
    this.model = require('../models/bird.js');
  }

  findBy(key, value) {
    return new Promise((resolve, reject) => {
      let query = {};

      query[key] = value;

      Database.getOne('species', query, { select: ['code'] }).then((bird) => {
        resolve(new this.model(bird.code));
      });
    });
  }

  fetch(key, value) {
    return new Promise((resolve, reject) => {
      let query = {};

      query[key] = value;

      Database.get('species', query, { select: ['code'] }).then((birds) => {
        resolve(birds);
      });

    });
  }

  random(key, value) {
    var matchingBirds = key && value ? this.fetch(key, value) : [];

    return (matchingBirds.length > 0 ? matchingBirds : this.all()).sort(() => .5 - Math.random())[0];
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
