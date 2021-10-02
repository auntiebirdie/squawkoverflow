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
      var birdypetData = require('../public/data/birdypets.json');

      var birdypetsMasterlist = {};
	    /*
      var flocksMasterlist = {};
      await DB.runQuery(DB.createQuery('MemberFlock')).then(async ([flocks]) => {
        for (var flock of flocks) {
          var oldId = flock[Datastore.KEY].id;
          var newId = uuid.generate();

          flocksMasterlist[oldId] = newId;

          await Redis.hmset(
            `flock:${newId}`, {
              "name": flock.name,
              "member": flock.member
            });
        }

	      fs.writeFileSync(__dirname + '/newFlocks.json', JSON.stringify(flocksMasterlist));
      });
*/
	    var flocksMasterlist = require('./newFlocks.json');


      DB.runQuery(DB.createQuery('MemberPet')).then(async ([birdypets]) => {
          for (var i = 0, len = birdypets.length; i < len; i++) {
            var memberpetId = uuid.generate();
            var flocks = birdypets[i].flocks ? birdypets[i].flocks.map((id) => flocksMasterlist[id] || flocksMasterlist[`${id}`]) : [];

            birdypetsMasterlist[birdypets[i][Datastore.KEY].id] = memberpetId;

            await Redis.hmset(
              `memberpet:${memberpetId}`, {
                "birdypetId": birdypets[i].birdypet,
                "birdypetSpecies": birdypetData.find((birdypet) => birdypet.id == birdypets[i].birdypet).species.speciesCode,
                "member": birdypets[i].member,
                "hatchedAt": birdypets[i].hatchedAt,
                "nickname": birdypets[i].nickname || "",
                "friendship": birdypets[i].friendship || 0,
                "flocks": flocks.join(",")
              },
              function(err, response) {}
            );

            console.log((i + 1) + "/" + len);
          }

	      fs.writeFileSync(__dirname + '/newBirds.json', JSON.stringify(birdypetsMasterlist));

            console.log("AND WE ARE DONE.");
            return true;
          });

      }
      catch (err) {
        console.log(err);
      }
    })();
