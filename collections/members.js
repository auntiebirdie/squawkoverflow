const Database = require('../helpers/database.js');

class Members {
  constructor() {
    this.model = require('../models/member.js');
  }

  all() {
    return new Promise((resolve, reject) => {
      Database.query('SELECT id FROM members ORDER BY username').then((results) => {
        Promise.all(results.map((result) => this.get(result.id))).then((results) => {
          resolve(results);
        });
      });
    });
  }

  get(id) {
    let Member = new this.model(id);

    return Member.fetch();
  }
}

module.exports = new Members;
