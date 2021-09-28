const helpers = require('../helpers');
const express = require('express');
const router = express.Router();

router.get('/', async (req, res) => {
  res.render('birdypedia/index');
});

module.exports = router;
