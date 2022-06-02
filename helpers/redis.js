const secrets = require('../secrets.json');
const redis = require('redis');

let DB = process.env.NODE_ENV == 'production' ? 'PROD' : 'DEV';
var connection = null;

class Redis {
  sendCommand(args) {
    return new Promise(async (resolve, reject) => {
      if (!connection) {
        connection = redis.createClient({
          url: `redis://${secrets.REDIS[DB].USER}:${secrets.REDIS[DB].AUTH}@${secrets.REDIS[DB].HOST}:${secrets.REDIS[DB].PORT}`
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
