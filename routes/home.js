const helpers = require('../helpers');
const secrets = require('../secrets.json');
const express = require('express');
const router = express.Router();

router.get('/', async (req, res) => {
  res.render('home/index', {
    page: "home"
  });
});

router.get('/logout', (req, res) => {
  req.session.destroy((err) => {
    res.redirect('/');
  });
});

module.exports = router;
