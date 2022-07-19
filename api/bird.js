const Audit = require('../helpers/audit.js');
const Bird = require('../models/bird.js');
const Birds = require('../collections/birds.js');
const Counters = require('../helpers/counters.js');
const Database = require('../helpers/database.js');
const Members = require('../collections/members.js');
const Variant = require('../models/variant.js');

module.exports = async (req, res) => {
  switch (req.method) {
    case "GET":
      if (req.query.id) {
        var bird = new Bird(req.query.id);

        // TODO - fix include
        await bird.fetch({
          include: ['variants', 'alternateNames', 'adjectives', 'memberData', 'creator', 'contributor'],
          member: req.query.loggedInUser
        }).then(async () => {
          if (req.query.include?.includes('members')) {
            let promises = [];

            await Members.all().then((members) => {
              for (let member of members) {
                if (!member.settings.privacy_profile) {
                  promises.push(Counters.get('species', member.id, bird.id).then(async (result) => {
                    member.owned = result;
                    member.wishlisted = await Database.count('wishlist', {
                      member: member.id,
                      species: bird.id,
                      intensity: [1, 2]
                    });

                    return member;
                  }));
                }
              }
            });

            await Promise.all(promises).then(async (responses) => {
              bird.members = responses.filter((response) => (response.owned + response.wishlisted) > 0);
            });
          }
        }).catch((err) => {
          bird = null;
        });
      } else if (req.query.taxonomy) {
        var birds = await Birds.fetch('*', req.query.taxonomy);

        if (birds.length > 0) {
          birds.sort(() => Math.random() - .5);

          var bird = new Bird(birds[0].id);

          await bird.fetch(req.query);
        } else {
          return res.json(null);
        }
      } else {
        var bird = await Birds.random().then((bird) => new Bird(bird.id));

        await bird.fetch(req.query);
      }

      res.json(bird);
      break;
    case "PUT":
      var bird = new Bird(req.body.id);

      var member = await Members.get(req.body.loggedInUser);

      if (member.contributor || member.admin) {
        var alternateNames = req.body.alternateNames.map((name, i) => {
          return {
            name: name,
            lang: req.body.alternateLangs[i]
          }
        });

        await Audit.log(`${req.body.id ? 'update' : 'create'} species`, {
          id: req.body.id,
          commonName: req.body.commonName,
          family: req.body.family,
          alternateNames: alternateNames.join("\r\n")
        });

        if (req.body.id) {
          if (req.body.commonName) {
            let commonName = req.body.commonName.replace(/\ʻ/g, "'").trim();

            await bird.set({
              'commonName': commonName
            });

            await bird.fetch({
              include: ['alternateNames']
            });

            var promises = [];

            for (let i = 0, len = bird.alternateNames.length; i < len; i++) {
              if (!alternateNames.find((alternate) => alternate.name == bird.alternateNames[i].name && alternate.lang == bird.alternateNames[i].lang)) {
                promises.push(Database.query('DELETE FROM species_names WHERE species = ? AND name = ? AND lang = ?', [req.body.id, bird.alternateNames[i].name, bird.alternateNames[i].lang]));
              }
            }

            for (let i = 0, len = alternateNames.length; i < len; i++) {
              if (alternateNames[i].name != "") {
                promises.push(Database.query('INSERT IGNORE INTO species_names VALUES (?, ?, ?)', [req.body.id, alternateNames[i].name, alternateNames[i].lang]));
              }
            }

            promises.push(Database.query('INSERT IGNORE INTO species_names VALUES (?, ?, ?)', [req.body.id, bird.commonName.replace(/\-/g, /\s/), 'xx']));

            await Promise.all(promises);
          }
        } else {
          await bird.create(req.body);
        }
      }

      res.json(bird.id);
      break;
    default:
      return res.error(405);
  }
}
