const Member = require('../models/member.js');
const BirdyPet = require('../models/birdypet.js');
const Variant = require('../models/variant.js');

const Database = require('../helpers/database.js');

module.exports = async (req, res) => {
  switch (req.method) {
    case "GET":
      var birdypet = new BirdyPet(req.query.id);

      await birdypet.fetch(req.query);

      res.json(birdypet);
      break;
    case "POST":
      if (!req.body.loggedInUser) {
        return res.sendStatus(401);
      }

      var birdypet = new BirdyPet();
      var member = new Member(req.body.loggedInUser);

      await birdypet.create({
        birdypet: req.body.birdypet,
        member: member.id
      });

      if (birdypet.id) {
        await member.fetch();

        if (req.body.adjective) {
          await member.set({
            lastHatchedAt: Date.now()
          });
        }

        return res.status(200).json(birdypet.id);
      } else {
        return res.sendStatus(404);
      }
      break;
    case "PUT":
      if (!req.body.loggedInUser) {
        return res.sendStatus(401);
      }

      var birdypet = new BirdyPet(req.body.birdypet);
      var member = new Member(req.body.loggedInUser);

      await Promise.all([
        birdypet.fetch({
          include: ['memberData'],
          member: member.id
        }),
        member.fetch()
      ]);

      if (birdypet.member == member.id) {
        let toUpdate = {};

        for (let key in req.body) {
          switch (key) {
            case 'nickname':
            case 'description':
              toUpdate[key] = req.body[key];
              break;
            case 'variant':
              var variant = new Variant(req.body[key]);
              await variant.fetch();

              if (variant.bird.id == birdypet.bird.id) {
                toUpdate[key] = req.body[key];
              }
              break;
            case 'flocks':
              var oldFlocks = birdypet.flocks || [];
              var newFlocks = req.body.flocks || [];

              var toAdd = newFlocks.filter((flock) => !oldFlocks.includes(flock));
              var toRemove = oldFlocks.filter((flock) => !newFlocks.includes(flock));

              for (let flock of toAdd) {
                if (flock) {
                  await Database.query('INSERT INTO birdypet_flocks VALUES (?, ?)', [birdypet.id, flock]);
                }
              }

              for (let flock of toRemove) {
                if (flock) {
                  await Database.query('DELETE FROM birdypet_flocks WHERE birdypet = ? AND flock = ?', [birdypet.id, flock]);
                }
              }

              break;
            case 'flock':
              let flocks = birdypet.flocks || [];

              let index = flocks.indexOf(req.body.flock);

              if (index !== -1) {
                await Database.query('DELETE FROM birdypet_flocks WHERE birdypet = ? AND flock = ?', [birdypet.id, req.body.flock]);
              } else {
                await Database.query('INSERT INTO birdypet_flocks VALUES (?, ?)', [birdypet.id, req.body.flock]);
              }

              break;
          }
        }

        if (Object.values(toUpdate).length > 0) {
          await birdypet.set(toUpdate);
        }

        return res.json(birdypet);
      } else {
        return res.sendStatus(403);
      }
      break;
      defualt:
        return res.sendStatus(405);
  }
};