const BirdyPet = require('../models/birdypet.js');
const Redis = require('../helpers/redis.js');

module.exports = async (req, res) => {
  switch (req.method) {
    case "GET":
      Redis.zrange('recentlyHatched', '0', '5', 'REV', (err, results) => {
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
