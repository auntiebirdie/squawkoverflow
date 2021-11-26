const Middleware = require('../helpers/middleware.js');

const express = require('express');
const router = express.Router();

router.get('/', Middleware.isLoggedIn, async (req, res) => {
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
    themes: themes
  });
});

module.exports = router;
