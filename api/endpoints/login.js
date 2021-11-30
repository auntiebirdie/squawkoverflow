const Database = require('../helpers/database.js');
const Member = require('../models/member.js');

const DiscordOauth2 = require("discord-oauth2");
const oauth = new DiscordOauth2();

const secrets = require('../secrets.json');

module.exports = async (req, res) => {
  if (req.body.konami) {
    let konami = req.query.konami * 1;

    Database.get('KonamiCode', konami).then((code) => {
      if (code.used) {
        return res.sendStatus(400);
      } else {
        Database.set('KonamiCode', konami, {
          used: true
        }).then(() => {
          return res.json(code.member);
        });
      }
    });
  } else if (req.body.code) {
    oauth.tokenRequest({
      clientId: secrets.DISCORD.CLIENT_ID,
      clientSecret: secrets.DISCORD.CLIENT_SECRET,
      redirectUri: "https://squawkoverflow.com/login",
      code: req.body.code,
      scope: 'identify',
      grantType: 'authorization_code'
    }).then((response) => {
      if (response.access_token) {
        oauth.getUser(response.access_token).then((user) => {
          let member = new Member(user.id);


          Member.get().then(async (member) => {
            if (member) {
              await Member.set({
                lastLogin: Date.now()
              });
            } else {
              await Member.create({
                username: user.username,
                avatar: `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.webp`,
                joinedAt: Date.now(),
                lastLogin: Date.now()
              });
            }

            return res.json(user.id);
          });
        });
      } else {
        console.log(response);
        return res.sendStatus(400);
      }
    }).catch((err) => {
      console.error(err);
      return res.sendStatus(400);
    });
  } else {
    res.sendStatus(400);
  }
};