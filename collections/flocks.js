const Database = require('../helpers/database.js');

class Flocks {
  constructor() {
    this.model = require('../models/flock.js');
  }

  get(id, params = {}) {
    let Flock = new this.model(id);

    return Flock.fetch(params);
  }

  all(member, params = {}) {
    return new Promise((resolve, reject) => {
      Database.get('flocks', {
        member: member
      }, {
        order: 'displayOrder'
      }).then((results) => {
        Promise.all(results.map((result) => this.get(result.id, params))).then((results) => {
          resolve(results);
        });
      });
    });
  }
}

module.exports = new Flocks;
