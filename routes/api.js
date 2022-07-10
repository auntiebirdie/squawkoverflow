const API = require('../helpers/api.js');
const Logger = require('../helpers/logger.js');
const secrets = require('../secrets.json');

const express = require('express');
const router = express.Router();

BigInt.prototype.toJSON = function() {
  return this.toString()
};

router.all('/*', async (req, res) => {
  var data = (req.method == "GET" || req.method == "HEAD" ? req.query : req.body) || {};

  if (data.loggedInUser && req.headers['knockknock'] == secrets.WHOSTHERE) {
    data.loggedInUser = data.loggedInUser;
  } else {
    data.loggedInUser = req.session.user;
  }

  for (let key in data) {
    try {
      switch (typeof data[key]) {
        case 'array':
        case 'object':
          data[key] = JSON.parse(data[key]);
          break;
      }
    } catch (err) {}
  }


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
