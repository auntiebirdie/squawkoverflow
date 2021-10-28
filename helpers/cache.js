const secrets = require('../secrets.json');
const Redis = require('./redis.js');

function Cache() {}

Cache.prototype.get = function(id) {
  return new Promise((resolve, reject) => {
    Redis.get('cache', id).then((results) => {
      if (!results || results.expiresAt <= Date.now()) {
        console.log('refresh data');
      }

      resolve(results);
    });
  });
}

Cache.prototype.refresh = function(id) {
  // refresh data
}

module.exports = new Cache();
