const BirdyPet = require('../models/birdypet.js');
const Database = require('../helpers/database.js');
const Redis = require('../helpers/redis.js');

module.exports = async (req, res) => {
  switch (req.method) {
    case "GET":
      Redis.zrange('recentlyHatched', '0', '5', 'REV', async (err, results) => {
        let promises = [];

        if (results.length == 0) {
          var recentlyHatched = await Database.get('birdypets', {
            member: {
              comparator: 'IS NOT',
              value_trusted: 'NULL'
            }
          }, {
            select: ['id', 'hatchedAt'],
            order: 'hatchedAt DESC',
            limit: 5
          });

          results = [];

          for (let result of recentlyHatched) {
            Redis.zadd('recentlyHatched', new Date(result.hatchedAt).getTime(), result.id);
            results.push(result.id);
          }
        }

        for (let result of results) {
          let birdypet = new BirdyPet(result);
          promises.push(birdypet.fetch());
        }

        Promise.all(promises).then((results) => {
          res.json(results);
        });
      });
      break;
  }
};
