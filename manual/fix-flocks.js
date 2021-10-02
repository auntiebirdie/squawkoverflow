const secrets = require('../secrets.json');
const uuid = require('short-uuid');
const Redis = require("redis").createClient(secrets.REDIS.MEMBERPETS.PORT, secrets.REDIS.MEMBERPETS.HOST);
Redis.auth(secrets.REDIS.MEMBERPETS.AUTH);

const {
  Datastore
} = require('@google-cloud/datastore');

const DB = new Datastore({
  namespace: 'squawkoverflow'
});

const fs = require('fs');

(async () => {
    try {
      var flocksMasterlist = require('./newFlocks.json');
      DB.runQuery(DB.createQuery('MemberFlock')).then(async ([flocks]) => {
          for (var i = 0, len = flocks.length; i < len; i++) {
		  var oldId = flocks[i][Datastore.KEY].id;
		  var newId = flocksMasterlist[oldId];

		await Redis.hmset(`flock:${newId}`, {
			"member" : flocks[i].member,
			"name" : flocks[i].name
		});
	  }
      });
      }
      catch (err) {
        console.log(err);
      }
    })();
