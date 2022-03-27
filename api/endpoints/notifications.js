const Database = require('../helpers/database.js');

const BirdyPet = require('../models/birdypet.js');
const Member = require('../models/member.js');

module.exports = async (req, res) => {
  switch (req.method) {
    case "GET":
      var notifications = await Database.get('notifications', {
        member: req.query.loggedInUser
      }, {
        order: 'createdAt DESC',
        limit: (req.query.page ? (((req.query.page * 1) - 1) * 25) : 0) + ', 25'
      });
      var totalResults = await Database.count('notifications', {
        member: req.query.loggedInUser
      });
      let promises = [];

      for (let notification of notifications) {
        let data = notification.data;

        if (data.from) {
          data.from = new Member(data.from);

          await data.from.fetch();
        }

        if (data.birdypet) {
          data.birdypet = new BirdyPet(data.birdypet);

          await data.birdypet.fetch();
        }

        if (!notification.viewed) {
          promises.push(Database.set('notifications', {
            id: notification.id
          }, {
            viewed: true
          }));
        }
      }

      Promise.all(promises).then(() => {
        return res.json({
          totalResults: totalResults,
          results: notifications
        });
      });
      break;
    case "PUT":
      var notification = await Database.getOne('notifications', {
        id: req.body.id
      });

      if (notification.member == req.body.loggedInUser) {
        switch (notification.type) {
          case 'birdypet_gift':
            if (req.body.action == 'thank') {
              notification.data.thanked = true;

              await Promise.all([
                Database.set('notifications', {
                  id: notification.id
                }, {
                  data: notification.data
                }),
                Database.create('notifications', {
                  id: Database.key(),
                  member: notification.data.from,
                  type: 'gift_thanks',
                  data: {
                    "from": req.body.loggedInUser,
                    "flair": req.body.data?.flair
                  }
                })
              ]);
            }
            break;
        }
      } else {
        return res.sendStatus(403);
      }

      res.sendStatus(200);
      break;
    case "DELETE":
      if (req.body.id == "ALL") {
        await Database.delete('notifications', {
          member: req.body.loggedInUser
        });

        res.sendStatus(200);
      } else {
        var notification = await Database.getOne('notifications', {
          id: req.body.id
        });

        if (notification.member == req.body.loggedInUser) {
          await Database.delete('notifications', {
            id: notification.id
          });

          res.sendStatus(200);
        } else {
          return res.sendStatus(403);
        }
      }

      break;
    default:
      return res.sendStatus(405);
  }
};
