const helpers = require('../helpers');
const secrets = require('../secrets.json');
const express = require('express');
const router = express.Router();

const DiscordOauth2 = require("discord-oauth2");
const oauth = new DiscordOauth2();

router.get('/', async (req, res) => {
  res.render('home/index');
});

router.get('/login', (req, res) => {
  if (process.env.KONAMI && process.env.KONAMI == req.query.code) {
    helpers.DB.get('Member', `${process.env.USER_ID}`).then((member) => {
      req.session.user = {
        id: process.env.USER_ID,
        username: member.username,
        avatar: member.avatar
      };

      res.redirect('/');
    });
  } else {
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
          req.session.user = {
            id: user.id,
            username: user.username,
            avatar: user.avatar
          };

          helpers.DB.get('Member', user.id).then((member) => {
            var data = {
              lastLogin: Date.now(),
              username: user.username,
              avatar: user.avatar
            };

            if (!member) {
              data.joinedAt = Date.now();
              helpers.DB.save('Member', user.id, data).then(() => {
                res.redirect('/');
              });
            } else {
              helpers.DB.set('Member', user.id, data).then(() => {
                res.redirect('/');
              });
            }
          });
        });
      } else {
        res.redirect('/error');
      }
    }).catch((err) => {
      console.log(err);
      res.redirect('/error');
    });
  }
});

router.get('/logout', (req, res) => {
  req.session.destroy((err) => {
    res.redirect('/');
  });
});

module.exports = router;
