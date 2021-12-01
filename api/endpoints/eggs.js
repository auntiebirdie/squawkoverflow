const Cache = require('../helpers/cache.js');

module.exports = async (req, res) => {
  let totals = req.query.loggedInUser ? await Cache.get('eggTotals', req.query.loggedInUser, "s") : {};

  let eggs = Object.entries(require('../data/eggs.json')).map(([egg, data]) => {
    let memberData = null;

    return {
      name: egg,
      speciesTotal: data.species.length,
      memberTotal: totals[egg] || 0
    }
  });

  res.json(eggs);
};
