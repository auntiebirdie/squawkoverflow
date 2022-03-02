const BirdyPet = require('../models/birdypet.js');
const Redis = require('../helpers/redis.js');

module.exports = async (req, res) => {
  switch (req.method) {
    case "GET":
      Redis.connect().zrevrangebyscore('recentlyHatched', '+inf', '-inf', 'LIMIT', 0, 5, (err, results) => {
        let promises = [];

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