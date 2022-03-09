const Database = require('../helpers/database.js');
const Redis = require('../helpers/redis.js');

module.exports = (req, res) => {
  Redis.zrange('artists', '-inf', '+inf', 'BYSCORE', (err, results) => {
    if (results.length == 0) {
      Database.query('SELECT DISTINCT credit AS name FROM variants ORDER BY name ASC').then((results) => {
        let promises = [];

        for (let i = 0, len = results.length; i < len; i++) {
          promises.push(Redis.zadd('artists', i, JSON.stringify(results[i])));
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
};