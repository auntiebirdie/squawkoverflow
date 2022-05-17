const Database = require('./database.js');
const Redis = require('./redis.js');

class Cache {
  count(id, query, params) {
    return new Promise((resolve, reject) => {
      Redis.get(id, (err, result) => {
        if (!result) {
          Database.count(query, params).then(async (result) => {
            Redis.set(id, result, () => {
              resolve(result);
            });
          });
        } else {
          resolve(result);
        }
      });
    });
  }

  increment(id, query, params) {
    return new Promise((resolve, reject) => {
      Redis.get(id, (err, result) => {
        if (!result) {
          this.count(id, query, params).then(resolve);
        } else {
          Redis.incr(id, (err, result) => {
            resolve(result);
          });
        }
      });
    });
  }

  decrement(id, query, params) {
    return new Promise((resolve, reject) => {
      Redis.get(id, (err, result) => {
        if (!result) {
          this.count(id, query, params).then(resolve);
        } else {
          Redis.decr(id, (err, result) => {
            resolve(result);
          });
        }
      });
    });
  }
}

module.exports = new Cache;
