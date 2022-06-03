const Database = require('../helpers/database.js');
const Members = require('../collections/members.js');
const Redis = require('../helpers/redis.js');

module.exports = async (req, res) => {
  switch (req.method) {
    case "PUT":
      if (req.body.loggedInUser) {
        var member = await Members.get(req.body.loggedInUser);

        if (member.contributor || member.admin) {
          await Database.query('INSERT INTO species_adjectives VALUES (?, ?)', [req.body.id, req.body.adjective]);

          await Redis.sendCommand(['KEYS', 'eggs:*']).then((results) => {
            for (let result of results) {
              Redis.sendCommand(['DEL', result]);
            }
          });

          return res.ok();
        } else {
          return res.error(403);
        }
      } else {
        return res.error(401);
      }
      break;
    case "DELETE":
      if (req.body.loggedInUser) {
        var member = await Members.get(req.body.loggedInUser);

        if (member.contributor || member.admin) {
          await Database.query('DELETE FROM species_adjectives WHERE species = ? AND adjective = ?', [req.body.id, req.body.adjective]);

          await Redis.sendCommand(['KEYS', 'eggs:*']).then((results) => {
            for (let result of results) {
              Redis.sendCommand(['DEL', result]);
            }
          });

          return res.ok();
        } else {
          return res.error(403);
        }
      } else {
        return res.error(401);
      }
      break;
    default:
      return res.error(405);
  }
}
