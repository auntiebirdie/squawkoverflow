const Database = require('./database.js');

class Counters {
  get(type, member, id) {
    return new Promise((resolve, reject) => {
      Database.getOne('counters', { member: member, type: type, id: id || "" }, { select: ['count'] }).then( (result) => {
        resolve(result ? result.count : 0);
      });
    });
  }
}

module.exports = new Counters;
