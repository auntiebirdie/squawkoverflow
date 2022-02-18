const Database = require('../helpers/database.js');
const Member = require('../models/member.js');

const DiscordOauth2 = require("discord-oauth2");
const oauth = new DiscordOauth2();

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
    await oauth.tokenRequest({
      clientId: secrets.DISCORD.CLIENT_ID,
      clientSecret: secrets.DISCORD.CLIENT_SECRET,
      redirectUri: process.env.K_SERVICE == 'api' ? 'https://squawkoverflow.com/login' :  'http://dev.squawkoverflow.com/login',
      code: req.body.code,
      scope: 'identify',
      grantType: 'authorization_code'
    }).then((response) => {
      if (response.access_token) {
        oauth.getUser(response.access_token).then(async (user) => {
          let member = new Member(user.id);

          await member.fetch();

          if (member.joinedAt) {
            await member.set({
              lastLoginAt: new Date()
            });

            return res.json(user.id);
          } else {
            await member.create({
              id: user.id,
              username: user.username,
              avatar: `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.webp`,
              joinedAt: new Date(),
              lastLoginAt: new Date(),
              tier: 0
            });

            return res.json(user.id);
          }
        });
      } else {
        console.error(response);
        return res.sendStatus(400);
      }
    }).catch((err) => {
      console.error('OAUTH FAILED', err);
      return res.sendStatus(400);
    });
  } else {
    res.sendStatus(400);
  }
};
