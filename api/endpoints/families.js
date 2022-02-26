const Database = require('../helpers/database.js');

module.exports = (req, res) => {
  Database.query('SELECT name, display, (SELECT COUNT(*) FROM species WHERE family = taxonomy.name AND code IN (SELECT species FROM variants)) AS total FROM taxonomy WHERE type = "family" ORDER BY name').then((results) => {
    res.json(results);
  });
};
