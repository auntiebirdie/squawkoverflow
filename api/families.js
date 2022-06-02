const Database = require('../helpers/database.js');
const Redis = require('../helpers/redis.js');

module.exports = (req, res) => {
  Redis.sendCommand(['ZRANGE', 'families', '-inf', '+inf', 'BYSCORE']).then((results) => {
    if (results.length == 0) {
      Database.query('SELECT name, display, (SELECT COUNT(*) FROM species WHERE family = taxonomy.name) AS total FROM taxonomy WHERE type = "family" ORDER BY name').then((results) => {
        let promises = [];

        for (let i = 0, len = results.length; i < len; i++) {
          promises.push(Redis.sendCommand(['ZADD', 'families', i, JSON.stringify(results[i])]));
        }

        Promise.all(promises).then(() => {
          res.json(results);
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
