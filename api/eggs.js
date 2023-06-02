const Counters = require('../helpers/counters.js');
const Database = require('../helpers/database.js');
const Redis = require('../helpers/redis.js');

const hash = require('object-hash');

module.exports = async (req, res) => {
  let results = await new Promise(async (resolve, reject) => {
    if (req.query.search) {
      var eggs = await Database.query('SELECT * FROM adjectives WHERE adjective LIKE ? ORDER BY adjective', [`${req.query.search}%`]);
    } else {
      var eggs = await Database.query('SELECT * FROM adjectives ORDER BY adjective');
    }

    resolve(eggs);
  });

  if (req.query.loggedInUser) {
    for (let result of results) {
      result.memberTotal = await Counters.get('eggs', req.query.loggedInUser, result.adjective);
      result.memberTotal = Math.min(result.memberTotal, result.numSpecies);
      result.prct = Math.floor(result.memberTotal / result.numSpecies * 100);
    }

    if (req.query.filters?.includes('incomplete')) {
      results = results.filter((result) => result.prct < 100);
    } else if (req.query.filters?.includes('completed')) {
      results = results.filter((result) => result.prct == 100);
    }
  }

  res.json({
    results
  });
};
