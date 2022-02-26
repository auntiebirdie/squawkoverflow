const Counters = require('../helpers/counters.js');
const Database = require('../helpers/database.js');

module.exports = (req, res) => {
  if (req.query.search) {
    Database.query('SELECT * FROM adjectives WHERE adjective LIKE ? ORDER BY adjective', [`${req.query.search}%`]).then(async (eggs) => {
      if (req.query.loggedInUser) {
        for (let egg of eggs) {
          egg.memberTotal = await Counters.get('eggs', req.query.loggedInUser, egg.adjective);
        }
      }

      res.json(eggs);
    });
  } else if (req.query.adjective) {
    Database.getOne('adjectives', {
      adjective: req.query.adjective
    }).then((egg) => {
      res.json(egg);
    });
  } else {
    Database.query('SELECT * FROM adjectives ORDER BY adjective').then((eggs) => {
      res.json(eggs);
    });
  }
};
