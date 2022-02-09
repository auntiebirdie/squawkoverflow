const Database = require('../helpers/database.js');

class Members {
  constructor() {
    this.model = require('../models/member.js');
  }

  all() {
    return new Promise((resolve, reject) => {
      Database.query('SELECT * FROM members ORDER BY username').then((results) => {
        resolve(results);
      });
    });
  }

  get(id) {
    let Member = new this.model(id);

    return Member.fetch();
  }
}

module.exports = new Members;
