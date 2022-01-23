const Counters = require('../helpers/counters.js');
const Database = require('../helpers/database.js');

const Member = require('../models/member.js');
const Variant = require('../models/variant.js');

const fs = require('fs');

module.exports = async (req, res) => {
  if (!req.body?.loggedInUser && !req.query?.loggedInUser) {
    return res.sendStatus(401);
  }

  switch (req.method) {
    case "GET":
      let member = new Member(req.query.loggedInUser);

      await member.fetch({
        include: ['aviary']
      });

      if (member.tier.aviaryLimit && member.aviary >= member.tier.aviaryLimit) {
        return res.status(403).json({
          aviaryFull: true
        });
      } else {
        let timeUntil = member.tier.eggTimer ? (Date.now() - new Date(member.lastHatchAt).getTime()) / 60000 : 0;

        if (timeUntil < member.tier.eggTimer) {
          return res.status(403).json({
            timeUntil: member.tier.eggTimer - timeUntil
          });
        } else {
          var eggs = await Database.query('SELECT adjective, numSpecies FROM adjectives ORDER BY RAND() LIMIT 6');

          for (let egg of eggs) {
            egg.numHatched = member.tier?.extraInsights ? await Counters.get('eggs', member.id, egg.adjective) : 0;
          };

          return res.status(200).json(eggs);
        }
      }
      break;
    case "POST":
      var birdypets = [];
      var species = await Database.query('SELECT species FROM species_adjectives WHERE adjective = ? ORDER BY RAND() LIMIT 10', [req.body.egg]);

      for (let bird of species) {
        try {
          var variant = new Variant(await Database.query('SELECT id FROM variants WHERE species = ? AND special = FALSE ORDER BY RAND() LIMIT 1', [bird.species]).then((result) => result.id));

          break;
        } catch (err) {
          continue;
        }
      }

      await variant.fetch();

      await variant.fetchMemberData(req.body.loggedInUser);

      return res.status(200).json(variant);
      break;
    default:
      return res.sendStatus(405);
  }
};
