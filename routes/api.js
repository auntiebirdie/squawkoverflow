const API = require('../helpers/api.js');

const express = require('express');
const router = express.Router();

router.all('/*', async (req, res) => {
	console.log(req.path);
  let data = (req.method == "GET" || req.method == "HEAD" ? req.query : req.body) || {};
  let endpoint = req.path.match(/\/?(\b[A-Za-z]+\b)/)[1];

  data.loggedInUser = req.session.user;

  API.call(endpoint, req.method, data).then((response) => {
    if (req.method == 'POST' || req.method == 'PUT') {
      delete req.session.loggedInUser;
    }

    res.json(response);
  }).catch((err) => {
    console.error(err);
    res.json(err.status);
  });
});

module.exports = router;
