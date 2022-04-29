const Database = require('../helpers/database.js');
const Member = require('../models/member.js');

const secrets = require('../secrets.json');
const https = require('https');

module.exports = async (req, res) => {
  if (req.body.konami) {
    let konami = req.body.konami;

    await Database.query('SELECT * FROM konami WHERE code = ?', [konami]).then(([code]) => {
      if (code.used) {
        return res.sendStatus(400);
      } else {
        Database.query('UPDATE konami SET used = true WHERE code = ?', [konami]).then(() => {
          return res.json(code.member);
        });
      }
    });
  } else if (req.body.code) {
    switch (req.body.state) {
      case 'discord':
        const DiscordOauth2 = require("discord-oauth2");
        const oauth = new DiscordOauth2();

        await oauth.tokenRequest({
          clientId: secrets.DISCORD.CLIENT_ID,
          clientSecret: secrets.DISCORD.CLIENT_SECRET,
          redirectUri: `https://${process.env.NODE_ENV == 'PROD' ? '' : 'dev.'}squawkoverflow.com/${req.body.connect ? 'settings/connect' : 'login'}`,
          code: req.body.code,
          scope: 'identify',
          grantType: 'authorization_code'
        }).then((response) => {
          if (response.access_token) {
            oauth.getUser(response.access_token).then(async (user) => {
              if (req.body.loggedInUser && req.body.connect) {
                let member = new Member(req.body.loggedInUser);

                member.exists().then(async (data) => {
                  await Database.query('INSERT INTO member_auth VALUES (?, "discord", ?)', [member.id, user.id]);

                  res.sendStatus(200);
                }).catch(() => {
                  res.sendStatus(400);
                });
              } else {
                let member = new Member({
                  auth: 'discord',
                  token: user.id
                });

                member.exists({
                  createIfNotExists: true,
                  data: {
                    username: user.username,
                    avatar: `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.webp`,
                    tier: 0
                  }
                }).then(async (data) => {
                  await member.set({
                    lastLoginAt: new Date()
                  });

                  return res.json(data.id);
                });
              }
            });
          } else {
            console.error(response);
            return res.sendStatus(400);
          }
        }).catch((err) => {
          return res.sendStatus(400);
        });
        break;
      case 'patreon':
        new Promise((resolve, reject) => {
          var request = https.request(`https://www.patreon.com/api/oauth2/token`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
              },
            },
            (response) => {
              var data = "";

              response.on('data', (chunk) => {
                data += chunk;
              });

              response.on('end', () => {
                resolve(JSON.parse(data));
              });
            });

          request.write(`code=${req.body.code}&grant_type=authorization_code&client_id=${secrets.PATREON.CLIENT_ID}&client_secret=${secrets.PATREON.CLIENT_SECRET}&redirect_uri=https://${process.env.NODE_ENV == 'PROD' ? '' : 'dev.'}squawkoverflow.com/settings/connect`);

          request.end();
        }).then((tokens) => {
          return new Promise((resolve, reject) => {
            var request = https.request(`https://www.patreon.com/api/oauth2/v2/identity?include=memberships,memberships.currently_entitled_tiers`, {
                method: 'GET',
                headers: {
                  'Authorization': `Bearer ${tokens.access_token}`,
                  'User-Agent': 'Patreon-JS'
                },
              },
              (response) => {
                var data = "";

                response.on('data', (chunk) => {
                  data += chunk;
                });

                response.on('end', () => {
                  resolve(JSON.parse(data));
                });
              });

            request.end();
          });
        }).then((response) => {
          const tiers = {
            '8368212': 0,
            '7920461': 1,
            '7920471': 2,
            '7920495': 3,
            '7932599': 4
          };

          const pledge = response.included.find((attr) => attr.type == 'tier');

          let member = new Member(req.body.loggedInUser);

          member.exists().then(async (data) => {
            var alreadyExists = await Database.count('member_auth', {
              provider: 'patreon',
              id: response.data.id
            });

            if (alreadyExists) {
              res.status(412).json({
                error: 'The selected Patreon account is already associated with another member.'
              });
            } else {
              await Promise.all([
                Database.query('UPDATE members SET tier = ? WHERE id = ?', [tiers[pledge.id], member.id]),
                Database.query('INSERT INTO member_auth VALUES (?, "patreon", ?)', [member.id, response.data.id]),
                Database.query('INSERT IGNORE INTO member_badges VALUES (?, "patreon", NOW())', [member.id])
              ]);


              res.sendStatus(200);
            }

            return res.json({});
          });
        }).catch((err) => {
          console.error(err);
          return res.sendStatus(400);
        });
        break;
    }
  } else if (req.body.credential) {
    const {
      OAuth2Client
    } = require('google-auth-library');
    const oauth = new OAuth2Client(secrets.GOOGLE.CLIENT_ID)

    await oauth.verifyIdToken({
      idToken: req.body.credential,
      audience: secrets.GOOGLE.CLIENT_ID
    }).then((response) => {

      const payload = response.getPayload();

      if (payload.sub) {
        if (req.body.loggedInUser && req.body.connect) {
          let member = new Member(req.body.loggedInUser);

          member.exists().then(async (data) => {
            var alreadyExists = await Database.count('member_auth', {
              provider: 'google',
              id: payload.sub
            });

            if (alreadyExists) {
              res.status(412).json({
                error: 'The selected Google account is already associated with another member.'
              });
            } else {
              await Database.query('INSERT INTO member_auth VALUES (?, "google", ?)', [member.id, payload.sub]);

              res.sendStatus(200);
            }
          }).catch(() => {
            res.sendStatus(400);
          });
        } else {
          let member = new Member({
            auth: 'google',
            token: payload.sub
          });

          member.exists({
            createIfNotExists: true,
            data: {
              username: payload.name,
              avatar: payload.picture ? payload.picture : '',
              tier: 0
            }
          }).then(async (data) => {
            await member.set({
              lastLoginAt: new Date()
            });

            return res.json(data.id);
          });
        }
      } else {
        console.error(payload);
        return res.sendStatus(400);
      }
    });
  } else {
    res.sendStatus(400);
  }
};
