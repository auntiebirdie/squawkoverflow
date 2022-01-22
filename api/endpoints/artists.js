const Database = require('../helpers/database.js');

module.exports = (req, res) => {
  Database.query('SELECT DISTINCT credit AS name FROM variants ORDER BY name ASC').then((results) => {
    res.json(results);
  });
};
