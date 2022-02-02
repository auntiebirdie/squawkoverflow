const BirdyPet = require('../models/birdypet.js');
const Database = require('../helpers/database.js');
const Exchange = require('../models/exchange.js');
const Member = require('../models/member.js');

module.exports = (req, res) => {
  let promises = [];

  switch (req.method) {
    case "GET":
      if (req.query.id) {
        var exchange = new Exchange(req.query.id);

        exchange.fetch(req.query).then(() => {
          res.json(exchange);
        }).catch(() => {
          res.json(null);
        });
      } else {
        Database.query('SELECT id FROM exchanges WHERE statusA >= 0 AND statusB >= 0 AND (memberA = ? OR (memberB = ? AND statusA > 0)) ORDER BY updatedAt DESC', [req.query.loggedInUser, req.query.loggedInUser]).then((exchanges) => {
          let results = [];
          let page = (((req.query.page * 1) - 1) || 0) * 10;

          for (let i = page, len = Math.min((page + 1) * 10, exchanges.length); i < len; i++) {
            let exchng = new Exchange(exchanges[i].id);

            promises.push(exchng.fetch({
              loggedInUser: req.query.loggedInUser
            }));

            results.push(exchng);
          }

          Promise.all(promises).then(() => {
            res.json({
              totalPages: Math.ceil(exchanges.length / 10),
              results: results
            });
          });
        });
      }
      break;
    case "POST":
      var exchange = new Exchange(req.body.exchange);

      exchange.fetch({
        loggedInUser: req.body.loggedInUser
      }).then(() => {
        if (exchange.mutable) {
          let birdypet = new BirdyPet(req.body.birdypet);

          birdypet.fetch({
            include: ['exchangeData'],
            member: req.body.member,
            exchange: exchange.id
          }).then(() => {
            if (birdypet.exchangeData == exchange.id) {
              Database.delete('exchange_birdypets', {
                exchange: exchange.id,
                birdypet: req.body.birdypet
              }).then(() => {
                Database.query('INSERT INTO exchange_logs VALUES (?, ?, NOW())', [exchange.id, `${birdypet.bird.commonName} was removed from the ${birdypet.member == exchange.memberA ? 'request' : 'offer'}.`]).then(() => {

                  res.sendStatus(200);
                });
              });
            } else if (!birdypet.exchangeData) {
              Database.create('exchange_birdypets', {
                exchange: req.body.exchange,
                birdypet: req.body.birdypet
              }).then(() => {
                Database.query('INSERT INTO exchange_logs VALUES (?, ?, NOW())', [exchange.id, `${birdypet.bird.commonName} was added to the ${birdypet.member == exchange.memberA ? 'offer' : 'request'}.`]).then(() => {
                  res.sendStatus(200);
                });
              });
            } else {
              res.sendStatus(409);
            }
          });
        } else {
          res.sendStatus(403);
        }
      }).catch(() => {
        res.json(null);
      });
      break;
    case "PUT":
      if (req.body.id) {
        var exchange = new Exchange(req.body.id);

        exchange.fetch({
          loggedInUser: req.body.loggedInUser
        }).then(() => {
          if (exchange.mutable && (exchange.memberA == req.body.loggedInUser || exchange.memberB == req.body.loggedInUser)) {
            if (exchange.birdypetsA.length == 0 && exchange.birdypetsB.length == 0) {
              throw `Please pick at least one bird to either request or offer.`;
            } else {
              if (exchange.memberA == req.body.loggedInUser) {
                exchange.statusA = Math.max(2, exchange.statusA + 1);
              } else {
                exchange.statusB = Math.max(2, exchange.statusB + 1);
              }

              Database.set('exchanges', {
                id: req.body.id
              }, {
                statusA: exchange.statusA,
                statusB: exchange.statusB,
                giveA: req.body.giveA,
                forB: req.body.forB,
                updatedAt: new Date()
              }).then(() => {
                if (exchange.statusA + exchange.statusB == 4) {
                  let promises = [];

                  for (let birdypet of exchange.birdypetsA) {
                    promises.push(birdypet.set({
                      member: exchange.memberB
                    }));
                  }

                  for (let birdypet of exchange.birdypetsB) {
                    promises.push(birdypet.set({
                      member: exchange.memberA
                    }));
                  }

                  promises.push(Database.query('INSERT INTO exchange_logs VALUES (?, ?, NOW())', [exchange.id, 'The offer was accepted by both parties!']));

                  Promise.all(promises).then(() => {
                    res.sendStatus(200);
                  });
                } else {
                  res.sendStatus(200);
                }
              });
            }

          } else {
            throw `${exchange.member.username} has not yet made a decision. You cannot make any changes to the offer until they do.`;
          }
        }).catch((err) => {
          res.json({
            error: err
          });
        });
      } else if (req.body.member) {
        let key = Database.key();

        Database.create('exchanges', {
          id: key,
          memberA: req.body.loggedInUser,
          memberB: req.body.member
        }).then(() => {
          res.json(key);
        });
      } else {
        res.sendStatus(404);
      }
      break;
    case "DELETE":
      var exchange = new Exchange(req.body.id);

      exchange.fetch({
        loggedInUser: req.body.loggedInUser
      }).then(() => {
        exchange.delete(req.body.loggedInUser).then(() => {
          res.sendStatus(200);
        }).catch(() => {
          res.sendStatus(403);
        });
      });
      break;
  }
}