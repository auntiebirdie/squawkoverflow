const API = require('../helpers/api.js');

const express = require('express');
const router = express.Router();

router.all('/*', async (req, res) => {
  let data = (req.method == "GET" || req.method == "HEAD" ? req.query : req.body) || {};

  data.loggedInUser = req.session.user;

  API.call(req.path.match(/\/?(\b[A-Za-z]+\b)/)[1], req.method, data).then((response) => {
    res.json(response);
  }).catch((err) => {
	  console.log(err);
  });
});

module.exports = router;
