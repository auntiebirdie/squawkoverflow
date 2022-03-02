const secrets = require('../secrets.json');
const redis = require('redis');

function Redis() {
  this.connection = null;
}

Redis.prototype.connect = function() {
  let DB = process.env.NODE_ENV == 'PROD' ? 'PROD' : 'DEV';

  if (!this.connection) {
    this.connection = redis.createClient(secrets.REDIS[DB].PORT, secrets.REDIS[DB].HOST);
    this.connection.auth(secrets.REDIS[DB].AUTH);
  }

  return this.connection;
}

Redis.prototype.get = function(id) {
  return new Promise((resolve, reject) => {
    this.connect().zrangebyscore(id, '-inf', '+inf', (err, results) => {
	    resolve(results);
    });
  });
}

Redis.prototype.add = function(id, value, sort) {
  return this.connect().zadd(id, sort, value);
}

module.exports = new Redis();
