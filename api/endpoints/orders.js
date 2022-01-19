const Database = require('../helpers/database.js');

module.exports = (req, res) => {
  Database.query('SELECT name FROM taxonomy WHERE type = "order" ORDER BY name').then((results) => {
    res.json(results);
  });
};
