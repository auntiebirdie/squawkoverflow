const API = require('../helpers/api.js');
const Logger = require('../helpers/logger.js');

const express = require('express');
const router = express.Router();

router.all('/*', async (req, res) => {
  var data = (req.method == "GET" || req.method == "HEAD" ? req.query : req.body) || {};

  data.loggedInUser = req.session.user;
  data.files = req.files;

  var log = {
    req: {
      method: req.method,
      url: req.path,
      headers: req.headers,
      data: data
    }
  };

  try {
    var endpoint = req.path.match(/\/?(\b[A-Za-z]+\b)/)[1];

    log.req.url = req.path;
  } catch (err) {
    var endpoint = null;
  }

  log.str = `/${req.method} ${endpoint || req.path} ${JSON.stringify(Object.fromEntries(Object.entries(data).filter((a) => ["id", "member", "loggedInUser"].includes(a[0]) )))}`;

  try {
    API.call(endpoint, req.method, data, req.headers).then((response) => {
      Logger.info({
        req: log.req
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