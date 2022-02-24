const API = require('../helpers/api.js');

const express = require('express');
const router = express.Router();

router.all('/*', async (req, res) => {
  try {
    let data = (req.method == "GET" || req.method == "HEAD" ? req.query : req.body) || {};
    let endpoint = req.path.match(/\/?(\b[A-Za-z]+\b)/)[1];

    data.loggedInUser = req.session.user;

    API.call(endpoint, req.method, data, req.headers).then((response) => {
      if (req.method == 'POST' || req.method == 'PUT') {
        delete req.session.loggedInUser;
      }

      res.json(response);
    }).catch((err) => {
      res.json(err);
    });
  } catch (err) {
    res.json(err);
  }
});

module.exports = router;
