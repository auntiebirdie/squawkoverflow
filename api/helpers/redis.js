const secrets = require('../secrets.json');
const redis = require('redis');

let DB = process.env.NODE_ENV == 'PROD' ? 'PROD' : 'DEV';
var connection = null;

module.exports = new Proxy((() => {
  if (!connection) {
    connection = redis.createClient(secrets.REDIS[DB].PORT, secrets.REDIS[DB].HOST);

    connection.auth(secrets.REDIS[DB].AUTH);
  }

  return connection;
})(), {
  get(target, prop, receiver) {
    return connection[prop];
  }
});
