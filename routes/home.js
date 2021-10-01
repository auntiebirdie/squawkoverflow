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
  if (req.query.konami) {
    helpers.DB.get('KonamiCode', req.query.konami * 1).then((code) => {
      if (code.used) {
        res.redirect('/error');
      } else {
        helpers.DB.get('Member', `${code.member}`).then((member) => {
          req.session.user = {
            id: member._id,
            username: member.username,
            avatar: member.avatar
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
  else { 
    res.redirect("https://discord.com/api/oauth2/authorize?client_id=885956624777351199&redirect_uri=https%3A%2F%2Fsquawkoverflow.com%2Flogin&response_type=code&scope=identify");
  }
});

router.get('/logout', (req, res) => {
  req.session.destroy((err) => {
    res.redirect('/');
  });
});

router.get('/birdypets/mine', (req, res) => {
  res.redirect(`/aviary/${req.session.user.id}`);
});

module.exports = router;
