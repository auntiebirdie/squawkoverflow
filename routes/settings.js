const API = require('../helpers/api.js');
const Middleware = require('../helpers/middleware.js');

const express = require('express');
const router = express.Router();

router.get('/', Middleware.isLoggedIn, (req, res) => {
  API.call('member', 'GET', {
    id: req.session.user,
    include: ['auth', 'rank', 'settings', 'titles']
  }).then((member) => {
    var themes = [{
        id: "default",
        name: "Default Duck",
        icon: "🦆"
      },
      {
        id: "dark",
        name: "Night Owl",
        icon: "🦉"
      },
      {
        id: "peacock-dark",
        name: "Pretty Peacock",
        icon: "🦚"
      }
    ];

    res.render('settings/index', {
      member: member,
      themes: themes,
      redirectUri: 'https://' + (process.env.DEV ? 'dev.' : '') + 'squawkoverflow.com/settings/connect'
    });
  });
});

router.get('/connect', Middleware.isLoggedIn, (req, res) => {
  if (req.query.code || req.query.credential) {
    API.call('login', 'POST', {
      ...req.query,
      loggedInUser: req.session.user,
      connect: true
    }).then((id) => {
      res.redirect('/settings');
    }).catch((err) => {
      if (err.response?.status == 412) {
        res.redirect('/settings?error=' + (encodeURIComponent('The account you selected is already associated with another member.')));
      } else {
        res.redirect('/settings');
      }
    });
  } else {
    res.redirect('/settings');
  }
});

router.get('/disconnect', Middleware.isLoggedIn, (req, res) => {
  API.call('disconnect', 'POST', {
    provider: req.query.provider,
    loggedInUser: req.session.user
  }).then((id) => {
    res.redirect('/settings');
  }).catch((err) => {
    res.redirect('/settings');
  });
});

module.exports = router;
