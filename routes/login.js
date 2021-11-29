const API = require('../helpers/api.js');
const Database = require('../helpers/database.js');
const Members = require('../helpers/members.js');

const helpers = require('../helpers');
const secrets = require('../secrets.json');
const express = require('express');
const router = express.Router();

const DiscordOauth2 = require("discord-oauth2");
const oauth = new DiscordOauth2();

router.get('/', (req, res) => {
  if (req.query.konami) {
    let konami = req.query.konami * 1;

    Database.get('KonamiCode', konami).then((code) => {
      if (code.used) {
        res.redirect('/error');
      } else {
        req.session.user = code.member;

        Database.set('KonamiCode', konami, {
          used: true
        }).then(() => {
          res.redirect('/');
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
          req.session.user = user.id;

          Members.get(user.id).then(async (member) => {
            if (member) {
              await Members.set(user.id, {
                lastLogin: Date.now()
              });
            } else {
              await Database.save('Member', user.id, {
                username: user.username,
                avatar: `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.webp`,
                joinedAt: Date.now(),
                lastLogin: Date.now()
              });
            }
            res.redirect('/');
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
