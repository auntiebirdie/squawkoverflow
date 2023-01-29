const secrets = require('../secrets.json');
const redis = require('redis');

var connection = null;

class Redis {
  sendCommand(args) {
    return new Promise(async (resolve, reject) => {
      if (secrets.REDIS) {
        if (!connection) {
          connection = redis.createClient({
            url: `redis://${secrets.REDIS.USER}:${secrets.REDIS.AUTH}@${secrets.REDIS.HOST}:${secrets.REDIS.PORT}`
          });

          await connection.connect();
        }

        connection.sendCommand(args.map((arg) => `${arg}`)).then((result) => {
          switch (args[0]) {
            case 'HGETALL':
              let array = result;
              result = {};

              for (let i = 0, len = array.length; i < len; i++) {
                if (i % 2 === 0) {
                  result[array[i]] = array[i + 1];
                }
              }
              break;
          }

          resolve(result);
        });
      } else {
        resolve([]);
      }
    });
  }
}

module.exports = new Redis;
