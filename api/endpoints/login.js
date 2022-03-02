const Database = require('../helpers/database.js');
const Member = require('../models/member.js');

const secrets = require('../secrets.json');

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
    const DiscordOauth2 = require("discord-oauth2");
    const oauth = new DiscordOauth2();

    await oauth.tokenRequest({
      clientId: secrets.DISCORD.CLIENT_ID,
      clientSecret: secrets.DISCORD.CLIENT_SECRET,
      redirectUri: process.env.NODE_ENV == 'PROD' ? 'https://squawkoverflow.com/login' : 'https://dev.squawkoverflow.com/login',
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
