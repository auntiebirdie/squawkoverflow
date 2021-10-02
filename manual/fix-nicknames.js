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
      var birdypetsMasterlist = require('./newBirds.json');
      DB.runQuery(DB.createQuery('MemberPet')).then(async ([birdypets]) => {
          for (var i = 0, len = birdypets.length; i < len; i++) {
		  var oldId = birdypets[i][Datastore.KEY].id;
		  var newId = birdypetsMasterlist[oldId];
if (birdypets[i].nickname) {
		  await Redis.hset(`memberpet:${newId}`, "nickname", birdypets[i].nickname);
};
	  }
      });
      }
      catch (err) {
        console.log(err);
      }
    })();
