const Middleware = require('../helpers/middleware.js');
const Members = require('../helpers/members.js');

const express = require('express');
const router = express.Router();

router.get('/', Middleware.isLoggedIn, async (req, res) => {
  var member = await Members.get(req.session.user.id);

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

  res.render('account/index', {
    member: member,
    themes: themes
  });
});

module.exports = router;
