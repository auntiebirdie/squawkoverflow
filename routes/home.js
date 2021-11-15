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

/* legacy redirect */
router.get('/birdypets/mine', (req, res) => {
  res.redirect(`/aviary/${req.session.user}`);
});

module.exports = router;
