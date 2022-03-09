const Counters = require('../helpers/counters.js');
const Database = require('../helpers/database.js');
const Redis = require('../helpers/redis.js');

const hash = require('object-hash');

module.exports = (req, res) => {
  const identifier = `eggs:${hash(req.query)}`;

  Redis.zrange(identifier, '-inf', '+inf', 'BYSCORE', async (err, results) => {
    if (results.length == 0) {
      results = await new Promise(async (resolve, reject) => {
        if (req.query.search) {
          var eggs = await Database.query('SELECT * FROM adjectives WHERE adjective LIKE ? ORDER BY adjective', [`${req.query.search}%`]);
        } else if (req.query.adjective) {
          var eggs = await Database.get('adjectives', {
            adjective: req.query.adjective
          });
        } else {
          var eggs = await Database.query('SELECT * FROM adjectives ORDER BY adjective');
        }

        let promises = [];

        for (let i = 0, len = eggs.length; i < len; i++) {
          promises.push(Redis.zadd(identifier, i, JSON.stringify(eggs[i])));
        }

        Promise.all(promises).then(() => {
          resolve(eggs);
        });
      });
    } else {
      for (let i = 0, len = results.length; i < len; i++) {
        results[i] = JSON.parse(results[i]);
      }
    }

    if (req.query.loggedInUser) {
      for (let result of results) {
        result.memberTotal = await Counters.get('eggs', req.query.loggedInUser, result.adjective);
      }
    }

    res.json(results);
  });
};
