const BirdyPet = require('../models/birdypet.js');
const Database = require('../helpers/database.js');
const Exchange = require('../models/exchange.js');
const Member = require('../models/member.js');
const Webhook = require('../helpers/webhook.js');

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
        Database.query('SELECT id FROM exchanges WHERE (memberA = ? AND statusA >= 0) OR (memberB = ? AND statusA > 0 AND statusB >= 0) OR (memberB = ? AND statusA < 0 AND statusB > 0) ORDER BY updatedAt DESC', [req.query.loggedInUser, req.query.loggedInUser, req.query.loggedInUser]).then((exchanges) => {
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
          if (req.body.birdypet) {
            let birdypet = new BirdyPet(req.body.birdypet);

            birdypet.fetch({
              include: ['exchangeData'],
              member: req.body.member,
              exchange: exchange.id
            }).then(() => {
              if (birdypet.exchangeData.find((data) => data.id == exchange.id)) {
                Database.delete('exchange_birdypets', {
                  exchange: exchange.id,
                  birdypet: birdypet.id,
                  variant: birdypet.variant.id,
                  member: birdypet.member
                }).then(() => {
                  Database.query('INSERT INTO exchange_logs VALUES (?, ?, NOW())', [exchange.id, `<${req.body.loggedInUser}> removed ${birdypet.bird.commonName} from the ${birdypet.member == exchange.memberA ? 'offer' : 'request'}.`]).then(() => {
                    Database.set('exchanges', {
                      id: exchange.id
                    }, {
                      statusA: Math.min(1, exchange.statusA),
                      statusB: Math.min(1, exchange.statusB),
                      updatedAt: new Date()
                    }).then(() => {
                      res.sendStatus(200);
                    });
                  });
                });
              } else if (birdypet.exchangeData.length == 0) {
                Database.create('exchange_birdypets', {
                  exchange: exchange.id,
                  birdypet: birdypet.id,
                  variant: birdypet.variant.id,
                  member: birdypet.member
                }).then(() => {
                  Database.query('INSERT INTO exchange_logs VALUES (?, ?, NOW())', [exchange.id, `<${req.body.loggedInUser}> added ${birdypet.bird.commonName} to the ${birdypet.member == exchange.memberA ? 'offer' : 'request'}.`]).then(() => {
                    Database.set('exchanges', {
                      id: exchange.id
                    }, {
                      statusA: Math.min(1, exchange.statusA),
                      statusB: Math.min(1, exchange.statusB),
                      updatedAt: new Date()
                    }).then(() => {
                      res.sendStatus(200);
                    });
                  });
                });
              } else {
                res.sendStatus(409);
              }
            });
          } else {
            Database.set('exchanges', {
              id: exchange.id,
            }, {
              giveA: req.body.giveA || exchange.giveA || "",
              forB: req.body.forB || exchange.forB || "",
              noteA: exchange.memberA == req.body.loggedInUser ? (req.body.noteA || exchange.noteA) : exchange.noteA || "",
              noteB: exchange.memberB == req.body.loggedInUser ? (req.body.noteB || exchange.noteB) : exchange.noteB || ""
            }).then(() => {
              res.sendStatus(200);
            });
          }
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
          var newExchange = exchange.statusA == 0 && exchange.statusB == 0;

          if (exchange.mutable && (exchange.memberA == req.body.loggedInUser || exchange.memberB == req.body.loggedInUser)) {
            if (exchange.birdypetsA.length == 0 && exchange.birdypetsB.length == 0) {
              throw `Please pick at least one bird to either request or offer.`;
            } else {
              if (exchange.memberA == req.body.loggedInUser) {
                exchange.statusA = exchange.statusA == 0 ? (exchange.birdypetsA.length == 0 ? 1 : 2) : 2;
              } else {
                exchange.statusB = 2;
              }

              Database.set('exchanges', {
                id: req.body.id
              }, {
                statusA: exchange.statusA,
                statusB: exchange.statusB,
                giveA: req.body.giveA || exchange.giveA || "this",
                forB: req.body.forB || exchange.forB || "this",
                noteA: req.body.noteA || exchange.noteA,
                noteB: req.body.noteB || exchange.noteB,
                updatedAt: new Date()
              }).then(() => {
                let memberA = new Member(exchange.memberA);
                let memberB = new Member(exchange.memberB);

                Promise.all([
                  memberA.fetch({
                    include: ['auth']
                  }),
                  memberB.fetch({
                    include: ['auth']
                  })
                ]).then(() => {
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
                    promises.push(Database.query('INSERT INTO notifications VALUES (?, ?, ?, ?, 0, NOW())',
                      [
                        Database.key(),
                        (req.body.loggedInUser == memberA.id ? memberB.id : memberA.id),
                        "exchange_accepted",
                        {
                          "from": req.body.loggedInUser == memberA.id ? memberA.id : memberB.id,
                          "exchange": exchange.id
                        }
                      ]
                    ));

                    Promise.all(promises).then(() => {
                      if (memberA.serverMember && memberB.serverMember) {
                        Webhook('exchange', {
                          content: req.body.loggedInUser == memberA.id ? `${memberA.username} and <@${memberB.auth.find((auth) => auth.provider == 'discord').id}> have come to an agreement!` : `${memberB.username} has accepted <@${memberA.auth.find((auth) => auth.provider == 'discord').id}>'s offer!`,
                          embeds: [{
                            description: 'The offer was accepted by both parties!',
                            thumbnail: {
                              url: 'https://emojipedia-us.s3.dualstack.us-west-1.amazonaws.com/thumbs/120/google/313/handshake_1f91d.png'
                            }
                          }]
                        }).then(() => {
                          res.sendStatus(200);
                        });
                      } else {
                        res.sendStatus(200);
                      }
                    });
                  } else if ((exchange.statusA == 1 || exchange.statusA == 2) && exchange.statusB == 0) {
                    if (memberA.serverMember && memberB.serverMember) {
                      let giveA = exchange.birdypetsA.map((birdypet) => birdypet.bird.commonName).join(', ');

                      if (giveA.length > 1000) {
                        giveA = giveA.slice(0, 1000) + "...";
                      } else if (giveA == "") {
                        giveA = "*You decide!*";
                      }

                      let forB = exchange.birdypetsB.map((birdypet) => birdypet.bird.commonName).join(', ');

                      if (forB.length > 1000) {
                        forB = forB.slice(0, 1000) + "...";
                      } else if (forB == "") {
                        forB = "*You decide!*";
                      }

                      if (newExchange) {
                        Webhook('exchange', {
                          content: `${memberA.username} has sent <@${memberB.auth.find((auth) => auth.provider == 'discord').id}> an offer!`,
                          embeds: [{
                            title: 'View Offer',
                            description: req.body.noteA || exchange.noteA || " ",
                            url: `https://squawkoverflow.com/exchange/${exchange.id}`,
                            fields: [{
                              name: `I'll give ${req.body.giveA || exchange.giveA}`,
                              value: giveA,
                              inline: false
                            }, {
                              name: `for ${req.body.forB || exchange.forB}`,
                              value: forB,
                              inline: false
                            }],
                            thumbnail: {
                              url: 'https://emojipedia-us.s3.dualstack.us-west-1.amazonaws.com/thumbs/320/google/110/person-with-folded-hands_1f64f.png'
                            }
                          }]
                        }).then(() => {
                          res.sendStatus(200);
                        });
                      } else {
                        res.sendStatus(200);
                      }
                    } else {
                      res.sendStatus(200);
                    }
                  } else {
                    res.sendStatus(200);
                  }
                });
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
        let member = new Member(req.body.member);

        member.fetch().then(() => {
          if (member.settings.privacy_exchange) {
            res.json({
              error: "This member isn't accepting offers at this time."
            });
          } else {
            let key = Database.key();

            Database.create('exchanges', {
              id: key,
              memberA: req.body.loggedInUser,
              memberB: req.body.member
            }).then(() => {
              res.json(key);
            });
          }
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
