const API = require('../helpers/api.js');
const Middleware = require('../helpers/middleware.js');

const express = require('express');
const router = express.Router();

router.get('/', Middleware.isLoggedIn, (req, res) => {
  API.call('member', 'GET', {
    id: req.session.user,
	  include: ['incubator']
  }).then((member) => {
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
        }
      ];

      res.render('settings/index', {
        member: member,
        themes: themes,
        tiers: tiers
      });
    });
  });
});

module.exports = router;
