const BirdyPet = require('../models/birdypet.js');
const Redis = require('../helpers/redis.js');

module.exports = async (req, res) => {
  switch (req.method) {
    case "GET":
      let data = [];
      let freebirds = await Redis.scan('freebird');

      if (freebirds.length > 0) {
        let ids = [];
        let limit = req.query?.limit || 24;

        freebirds.sort(() => .5 - Math.random());

        for (let i = 0, len = freebirds.length; i < len; i++) {
          try {
	    let key = freebirds[i].split(':').pop();
            let birdypet = new BirdyPet(await Redis.get('freebird', key));

            if (!ids.includes(birdypet.id)) {
              if (req.query?.loggedInUser) {
                await birdypet.fetchMemberData(req.query.loggedInUser);
              }

              birdypet.freebirdId = key;

              ids.push(birdypet.id);
              data.push(birdypet);

              if (data.length == limit) {
                break;
              }
            }
          } catch (err) {
            console.error(key, err);
          }
        }
      }

      res.json({
        totalPages: 0,
        results: data
      });

      break;
    default:
      return res.sendStatus(405);
  }
};
