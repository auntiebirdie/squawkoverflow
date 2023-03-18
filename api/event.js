const Database = require('../helpers/database.js');

module.exports = async (req, res) => {
  return res.json(await Database.query('SELECT id, name FROM events WHERE NOW() BETWEEN events.startDate AND events.endDate LIMIT 1'));
};
