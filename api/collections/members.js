const Cache = require('../helpers/cache.js');

class Members {
  constructor() {
    this.model = require('../models/member.js');
  }

  all() {
    return new Promise((resolve, reject) => {
      Cache.get('cache', 'members', 's').then((ids) => {
        Promise.all(ids.map((id) => this.get(id))).then((members) => {
          resolve(members.filter((member) => member && member.active).sort((a, b) => a.username.localeCompare(b.username)));
        });
      });
    });
  }

  get(id) {
    let Member = new this.model(id);

    return Member.fetch();
  }
}

module.exports = Members;
