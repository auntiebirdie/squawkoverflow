const Database = require('../helpers/database.js');

module.exports = async (req, res) => {
  return new Promise(async (resolve, reject) => {
    /* New Day New Bait! */
    await Database.query('UPDATE counters SET `count` = 0 WHERE type = "bait"');

    resolve();
  }).then(() => {
    return res.sendStatus(200);
  });
};