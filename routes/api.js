const API = require('../helpers/api.js');
const Logger = require('../helpers/logger.js');

const express = require('express');
const router = express.Router();

router.all('/*', async (req, res) => {
  try {
    let data = (req.method == "GET" || req.method == "HEAD" ? req.query : req.body) || {};
    let endpoint = req.path.match(/\/?(\b[A-Za-z]+\b)/)[1];

    data.loggedInUser = req.session.user;

    var log = {
      req: {
        method: req.method,
        url: endpoint,
        headers: req.headers,
        data: data
      }
      str: `${tx} /${req.method} ${endpoint} ${JSON.stringify(Object.fromEntries(Object.entries(data).filter((a) => ["id", "member", "loggedInUser"].includes(a[0]) )))}`
    };

    API.call(endpoint, req.method, data, req.headers).then((response) => {
      Logger.info({
        req: log.req,
        res: response
      }, log.str);

      res.json(response);
    }).catch((err) => {
      Logger.info({
        req: log.req,
        err: err
      }, log.str);

      res.json(err);
    });
  } catch (err) {
    Logger.info({
      req: log.req,
      err: err
    }, log.str);

    res.json(err);
  }
});

module.exports = router;
