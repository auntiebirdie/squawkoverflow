const API = require('../helpers/api.js');
const Middleware = require('../helpers/middleware.js');

const express = require('express');
const router = express.Router();

router.get('/', Middleware.isLoggedIn, (req, res) => {
  API.call('tiers', 'GET', {
    member: req.session.user
  }).then((tiers) => {
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
        id: "peacock-light",
        name: "Pretty Peacock (Light)",
        icon: "🦚"
      },
      {
        id: "peacock-dark",
        name: "Pretty Peacock (Dark)",
        icon: "🦚"
      }
    ];

    res.render('settings/index', {
      member: req.session.loggedInUser,
      themes: themes,
      tiers: tiers
    });
  });
});

module.exports = router;