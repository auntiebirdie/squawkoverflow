const helpers = require('../helpers');
const secrets = require('../secrets.json');
const express = require('express');
const router = express.Router();

router.get('/', async (req, res) => {
  res.render('faq/index');
});

module.exports = router;
