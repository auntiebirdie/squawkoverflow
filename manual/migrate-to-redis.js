const secrets = require('../secrets.json');

const redis = require("redis").createClient(secrets.REDIS.PORT, secrets.REDIS.HOST);

redis.auth(secrets.REDIS.AUTH);

const {
  Datastore
} = require('@google-cloud/datastore');

const DB = new Datastore({
  namespace: 'squawkoverflow'
});

(async () => {
  try {
    DB.runQuery(DB.createQuery('MemberPet').filter('hatchedAt', '<', 1632827824825).limit(5)).then(([birdypets]) => {
	    for (var i = 0, len = birdypets.length; i < len; i++) {
		    redis.hmset(
			    birdypets[i][Datastore.KEY].id,
			    "birdypet",
			    birdypets[i].birdypet,
			    "member",
			    birdypets[i].member,
			    "nickname",
			    birdypets[i].nickname,
			    "hatchedAt",
			    birdypets[i].hatchedAt,
			    "friendship",
			    birdypets[i].friendship

		    );
	    }
    });

  } catch (err) {
    console.log(err);
  }
})();
