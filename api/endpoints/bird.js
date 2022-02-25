const Bird = require('../models/bird.js');
const Birds = require('../collections/birds.js');
const Counters = require('../helpers/counters.js');
const Database = require('../helpers/database.js');
const Members = require('../collections/members.js');

module.exports = async (req, res) => {
  switch (req.method) {
    case "GET":
      var bird = new Bird(req.query.speciesCode);

      await bird.fetch({
        include: ['variants', 'adjectives', 'memberData'],
        member: req.query.loggedInUser
      });

      if (req.query.include?.includes('members')) {
        let promises = [];

        await Members.all().then((members) => {
          for (let member of members) {
            if (!member.settings.privacy_profile) {
              promises.push(Counters.get('species', member.id, bird.code).then((result) => {
                return {
                  member: member,
                  count: result
                }
              }));
            }
          }
        });

        await Promise.all(promises).then((responses) => {
          bird.members = responses.filter((response) => response.count > 0).map((response) => response.member);
        });
      }

      res.json(bird);
      break;
    case "POST":
      if (req.body.loggedInUser) {
        var member = await Members.get(req.body.loggedInUser);

        if (member.contributor || member.admin) {
          await Database.query('INSERT INTO species_adjectives VALUES (?, ?)', [req.body.speciesCode, req.body.adjective]);

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
          await Database.query('DELETE FROM species_adjectives WHERE species = ? AND adjective = ?', [req.body.speciesCode, req.body.adjective]);

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