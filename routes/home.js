const API = require('../helpers/api.js');

const express = require('express');
const router = express.Router();

router.get('/', async (req, res) => {
  res.render('home/index', {
    page: "home"
  });
});

router.get('/login', (req, res) => {
	API.call('login', 'POST', req.query).then( (id) => {
		console.log(id);
	});
});

router.get('/logout', (req, res) => {
  req.session.destroy((err) => {
    res.redirect('/');
  });
});

module.exports = router;
