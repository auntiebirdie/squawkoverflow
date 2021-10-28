var Redis = require('./redis.js');

module.exports = {
  format: function(member) {
    member.settings = member.settings ? JSON.parse(member.settings) : {};

    return member;
  },

  get: function(id) {
    return new Promise((resolve, reject) => {
      Redis.get('member', id).then((member) => {
        resolve(this.format(member));
      });
    });
  }
}
