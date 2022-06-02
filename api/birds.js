const Bird = require('../models/bird.js');
const Birds = require('../collections/birds.js');
const Redis = require('../helpers/redis.js');

const hash = require('object-hash');

module.exports = (req, res) => {
  Redis.sendCommand(['ZRANGE', `birds:${hash(req.query)}`, '-inf', '+inf', 'BYSCORE']).then(async (results) => {
    if (results.length == 0) {
      if (req.query.search) {
        var birds = await Birds.fetch('*', req.query.search);
      } else {
        var birds = await Birds.all();
      }

      let promises = [];

      for (let bird of birds) {
        bird = new Bird(bird.id);

        promises.push(bird.fetch());
      }

      Promise.all(promises).then((birds) => {
        let promises = [];

        for (let i = 0, len = birds.length; i < len; i++) {
          promises.push(Redis.sendCommand(['ZADD', `birds:${hash(req.query)}`, i, JSON.stringify(birds[i])]));
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
