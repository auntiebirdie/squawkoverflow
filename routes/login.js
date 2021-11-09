const Members = require('../helpers/members.js');

const helpers = require('../helpers');
const secrets = require('../secrets.json');
const express = require('express');
const router = express.Router();

const DiscordOauth2 = require("discord-oauth2");
const oauth = new DiscordOauth2();

router.get('/', (req, res) => {
  if (req.query.konami) {
    helpers.DB.get('KonamiCode', req.query.konami * 1).then((code) => {
      if (code.used) {
        res.redirect('/error');
      } else {
        Members.get(code.member).then((member) => {
          req.session.user = {
            id: member._id,
            username: member.username,
            avatar: member.avatar,
            theme: member.settings.theme || "default"
          };

          helpers.DB.set('KonamiCode', req.query.konami * 1, {
            used: true
          }).then(() => {
            res.redirect('/');
          });
        });
      }
    });
  } else if (req.query.code) {
    oauth.tokenRequest({
      clientId: secrets.DISCORD.CLIENT_ID,
      clientSecret: secrets.DISCORD.CLIENT_SECRET,
      redirectUri: "https://squawkoverflow.com/login",
      code: req.query.code,
      scope: 'identify',
      grantType: 'authorization_code'
    }).then((response) => {
      if (response.access_token) {
        oauth.getUser(response.access_token).then((user) => {
          Members.get(user.id).then((member) => {
            var data = {
              id: user.id,
              username: member ? member.username : user.username,
              joinedAt: member ? member.joinedAt : Date.now(),
              lastLogin: Date.now()
            };

            req.session.user = {
              id: data.id,
		    avatar: member.avatar,
              username: data.username,
              theme: member?.settings?.theme || "default"
            }

            helpers.Redis.set('member', user.id, data).then(() => {
              res.redirect('/');
            });
          }).catch((err) => {
            console.error(err);
            helpers.Redis.set('member', user.id, {
              lastLogin: Date.now()
            }).then(() => {
              res.redirect('/');
            });
          });
        });
      } else {
        res.redirect('/error');
      }
    }).catch((err) => {
      console.log(err);
      res.redirect('/error');
    });
  } else {
    res.redirect("https://discord.com/api/oauth2/authorize?client_id=885956624777351199&redirect_uri=https%3A%2F%2Fsquawkoverflow.com%2Flogin&response_type=code&scope=identify");
  }
});

module.exports = router;
