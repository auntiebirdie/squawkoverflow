const Counters = require('../helpers/counters.js');
const Database = require('../helpers/database.js');

module.exports = (req, res) => {
  Database.query('SELECT * FROM adjectives WHERE adjective LIKE ?', [`${req.query.firstLetter}%`]).then(async (eggs) => {
    if (req.query.loggedInUser) {
      for (let egg of eggs) {
        egg.memberTotal = await Counters.get('eggs', req.query.loggedInUser, egg.adjective);
      }
    }

    res.json(eggs);
  });
};