const BirdyPet = require('../models/birdypet.js');
const Redis = require('../helpers/redis.js');

module.exports = async (req, res) => {
  switch (req.method) {
    case "GET":
      let data = [];
      let freebirds = await Redis.scan('freebird', {
        KEYSONLY: true
      });

      if (freebirds.length > 0) {
        freebirds.sort(() => .5 - Math.random());

        for (let i = 0, len = req.query?.limit || 24; i < len; i++) {
          let birdypet = new BirdyPet(await Redis.get('freebird', freebirds[i]));

          if (req.query?.loggedInUser) {
            await birdypet.fetchMemberData(req.query.loggedInUser);
          }

          birdypet.freebirdId = freebirds[i];

          data.push(birdypet);
        }
      }

      return res.json({
        totalPages: 0,
        results: data
      });
      break;
    default:
      return res.sendStatus(405);
  }
};
