const Redis = require('../helpers/redis.js');

Redis.sendCommand(['FLUSHDB']).then((results) => {
	console.log(results);
	process.exit(0);
});
