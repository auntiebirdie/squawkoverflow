const Database = require('./database.js');
const Redis = require('./redis.js');

class Cache {
  count(id, query, params) {
    return new Promise((resolve, reject) => {
      Redis.sendCommand(['GET', id]).then((result) => {
        if (!result) {
          Database.count(query, params).then(async (result) => {
            Redis.sendCommand(['SET', id, `${result * 1}`]).then(() => {
              resolve(result * 1);
            });
          });
        } else {
          resolve(result * 1);
        }
      });
    });
  }

  increment(id, query, params) {
    return new Promise((resolve, reject) => {
      Redis.sendCommand(['GET', id]).then((result) => {
        if (!result) {
          this.count(id, query, params).then(resolve);
        } else {
          Redis.sendCommand(['INCR', id]).then((result) => {
            resolve(result);
          });
        }
      });
    });
  }

  decrement(id, query, params) {
    return new Promise((resolve, reject) => {
      Redis.sendCommand(['GET', id]).then((result) => {
        if (!result) {
          this.count(id, query, params).then(resolve);
        } else {
          Redis.sendCommand(['DECR', id]).then((result) => {
            resolve(result);
          });
        }
      });
    });
  }
}

module.exports = new Cache;
