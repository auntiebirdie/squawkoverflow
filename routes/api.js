const API = require('../helpers/api.js');
const Logger = require('../helpers/logger.js');
const uuid = require('short-uuid');

const express = require('express');
const router = express.Router();

router.all('/*', async (req, res) => {
  try {
    let data = (req.method == "GET" || req.method == "HEAD" ? req.query : req.body) || {};
    let endpoint = req.path.match(/\/?(\b[A-Za-z]+\b)/)[1];
    let tx = uuid.generate();

    data.loggedInUser = req.session.user;

    Logger.info({
      req: {
        tx: tx,
        method: req.method,
        url: endpoint,
        headers: req.headers,
        data: data
      }
    }, `/${req.method} ${endpoint} ${JSON.stringify(Object.fromEntries(Object.entries(data).filter((a) => ["id", "member", "loggedInUser"].includes(a[0]) )))}`);

    API.call(endpoint, req.method, data, req.headers).then((response) => {
      res.json(response);
    }).catch((err) => {
      Logger.info({
        tx: tx,
        err: err
      });
      res.json(err);
    });
  } catch (err) {
    Logger.info({
      tx: tx,
      err: err
    });
    res.json(err);
  }
});

module.exports = router;
