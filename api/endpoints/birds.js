const Bird = require('../models/bird.js');
const Birds = require('../collections/birds.js');
const Redis = require('../helpers/redis.js');

const hash = require('object-hash');

module.exports = (req, res) => {
  Redis.zrange(`birds:${hash(req.query)}`, '-inf', '+inf', 'BYSCORE', async (err, results) => {
    if (results.length == 0) {
      if (req.query.search) {
        var birds = await Birds.fetch('*', req.query.search);
      } else {
        var birds = await Birds.all();
      }

      let promises = [];

      for (let bird of birds) {
        bird = new Bird(bird.code);

        promises.push(bird.fetch());
      }

      Promise.all(promises).then((birds) => {
        let promises = [];

        for (let i = 0, len = birds.length; i < len; i++) {
          promises.push(Redis.zadd(`birds:${hash(req.query)}`, i, JSON.stringify(birds[i])));
        }

        Promise.all(promises).then(() => {
          res.json(birds);
        });
      });
    } else {
      for (let i = 0, len = results.length; i < len; i++) {
        results[i] = JSON.parse(results[i]);
      }

      res.json(results);
    }
  });
}
