const API = require('../helpers/api.js');

const express = require('express');
const router = express.Router();

router.get('/', async (req, res) => {
  res.render('home/index', {
    page: "home"
  });
});

router.get('/login', (req, res) => {
  if (req.query.code || req.query.konami) {
    API.call('login', 'POST', req.query).then((id) => {
      req.session.user = id;

      req.session.save((err) => {

        res.redirect('/');
      });
    });
  } else {
    var redirectUri = process.env.DEV ? 'http%3A%2F%2F35.208.110.100' : 'https%3A%2F%2Fsquawkoverflow.com';
    res.redirect(`https://discord.com/api/oauth2/authorize?client_id=885956624777351199&redirect_uri=${redirectUri}%2Flogin&response_type=code&scope=identify`);
  }
});

router.get('/logout', (req, res) => {
  req.session.destroy((err) => {
    res.redirect('/');
  });
});

module.exports = router;