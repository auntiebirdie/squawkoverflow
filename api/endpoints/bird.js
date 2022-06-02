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

        await bird.fetch({
          include: ['variants', 'adjectives', 'memberData', 'artist'],
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
        if (req.body.id) {
          if (req.body.commonName) {
            await bird.set({
              'commonName': req.body.commonName
            });
            await Audit.log('update species', req.body);
          }
        } else {
          await bird.create(req.body);
          await Audit.log('create species', req.body);
        }
      }

      res.json(bird.id);
      break;
    default:
      return res.sendStatus(405);
  }
}