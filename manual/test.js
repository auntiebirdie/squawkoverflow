const secrets = require('../secrets.json');

const Redis = require("redis").createClient(secrets.REDIS.MEMBERPETS.PORT, secrets.REDIS.MEMBERPETS.HOST);

Redis.auth(secrets.REDIS.MEMBERPETS.AUTH);

const {
  Datastore
} = require('@google-cloud/datastore');

const DB = new Datastore({
  namespace: 'squawkoverflow'
});

(async () => {
  try {
    await Redis.sendCommand('FT.SEARCH', ['memberpet', '@flocks:{5642359077339136}'], function (err, response) {
	    var output = {};

	    for (var i = 1, len = response.length; i < len; i++) {
		    output[response[i]] = response[++i];
	    }

	    console.log(output);
    });
  } catch (err) {
    console.log(err);
  }
})();
