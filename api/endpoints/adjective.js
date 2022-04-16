const Database = require('../helpers/database.js');
const Members = require('../collections/members.js');

module.exports = async (req, res) => {
  switch (req.method) {
    case "PUT":
      if (req.body.loggedInUser) {
        var member = await Members.get(req.body.loggedInUser);

        if (member.contributor || member.admin) {
          await Database.query('INSERT INTO species_adjectives VALUES (?, ?)', [req.body.id, req.body.adjective]);

          return res.sendStatus(200);
        } else {
          return res.sendStatus(403);
        }
      } else {
        return res.sendStatus(401);
      }
      break;
    case "DELETE":
      if (req.body.loggedInUser) {
        var member = await Members.get(req.body.loggedInUser);

        if (member.contributor || member.admin) {
          await Database.query('DELETE FROM species_adjectives WHERE species = ? AND adjective = ?', [req.body.id, req.body.adjective]);

          return res.sendStatus(200);
        } else {
          return res.sendStatus(403);
        }
      } else {
        return res.sendStatus(401);
      }
      break;
    default:
      return res.sendStatus(405);
  }
}
