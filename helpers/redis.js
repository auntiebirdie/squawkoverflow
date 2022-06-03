const secrets = require('../secrets.json');
const redis = require('redis');

var connection = null;

class Redis {
  sendCommand(args) {
    return new Promise(async (resolve, reject) => {
      if (!connection) {
        connection = redis.createClient({
          url: `redis://${secrets.REDIS[secrets.ENV].USER}:${secrets.REDIS[secrets.ENV].AUTH}@${secrets.REDIS[secrets.ENV].HOST}:${secrets.REDIS[secrets.ENV].PORT}`
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
    });
  }
}

module.exports = new Redis;
