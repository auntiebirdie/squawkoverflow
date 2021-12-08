const Counters = require('../helpers/counters.js');

module.exports = (req, res) => {
  let promises = [];

  let eggs = Object.entries(require('../data/eggs.json')).map(([egg, data]) => {
    let promise = req.query.loggedInUser ? Counters.get('eggs', req.query.loggedInUser, egg) : 0;

    promises.push(promise);

    return {
      name: egg,
      speciesTotal: data.species.length,
      memberTotal: promise
    }
  });

  Promise.allSettled(promises).then((results) => {
    eggs.forEach((egg) => {
      egg.memberTotal.then((value) => {
        egg.memberTotal = value;
      });
    });

    res.json(eggs);
  });
};
