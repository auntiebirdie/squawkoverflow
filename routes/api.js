const API = require('../helpers/api.js');

const Middleware = require('../helpers/middleware.js');
const Redis = require('../helpers/redis.js');

const chance = require('chance').Chance();
const express = require('express');
const router = express.Router();

const {
  GoogleAuth
} = require('google-auth-library');

const auth = new GoogleAuth();

router.post('/flocks/:flock/:memberpet', Middleware.isLoggedIn, Middleware.entityExists, Middleware.userOwnsEntity, (req, res) => {
  var index = req.entities['memberpet'].flocks ? req.entities['memberpet'].flocks.indexOf(req.entities['flock']._id) : -1;
  var flocks = req.entities['memberpet'].flocks ? req.entities['memberpet'].flocks.split(",") : [];

  if (index !== -1) {
    flocks = flocks.splice(index, -1);
  } else {
    flocks.push(req.entities['flock']._id);
  }

  Redis.set('memberpet', req.entities['memberpet']._id, {
    flocks: flocks.join(',')
  }).then(() => {
    res.json({
      action: index !== -1 ? "remove" : "add"
    });
  });
});

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
