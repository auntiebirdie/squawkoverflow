const Database = require('../helpers/database.js');

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
	    Database.get('flocks', { member : member }, { order: 'displayOrder' }).then( (results) => {
		    resolve(results);
      });
    });
  }
}

module.exports = new Flocks;
