const API = require('../helpers/api.js');

const express = require('express');
const router = express.Router();

router.get('/', async (req, res) => {
  API.call('activity', 'GET').then((results) => {
    res.render('home/index', {
      page: "home",
      sidebar: "recentActivity",
      activity: results
    });
  });
});

router.get('/login', (req, res) => {
  if (req.query.code || req.query.credential || req.query.konami) {
    API.call('login', 'POST', req.query).then((id) => {
      req.session.user = id;

      req.session.save((err) => {
        res.redirect('/');
      });
    }).catch((err) => {
      console.log(err);
      res.redirect('/');
    });
  } else {
    res.clearCookie('connect.sid', {
      domain: '.squawkoverflow.com'
    });
    res.clearCookie('connect.sid', {
      domain: 'squawkoverflow.com'
    });
    res.clearCookie('connect.sid', {
      domain: 'dev.squawkoverflow.com'
    });
    res.clearCookie('connect.sid', {
      domain: '.dev.squawkoverflow.com'
    });
    res.render('home/login', {
      redirectUri: 'https://' + (process.env.DEV ? 'dev.' : '') + 'squawkoverflow.com/login'
    });
  }
});

router.get('/logout', (req, res) => {
  req.session.destroy((err) => {
    res.redirect('/');
  });
});

router.get('/contact', (req, res) => {
  res.render('home/contact');
});

router.get('/privacy-policy', (req, res) => {
  res.render('home/privacy');
});

router.get('/terms-of-service', (req, res) => {
  res.render('home/terms');
});

router.get('/oembed', async (req, res) => {
  var json = {
    version: '1.0',
    provider_name: 'SQUAWKoverflow',
    provider_url: 'https://squawkoverflow.com',
  };

  if (req.query.data) {
    json = {
      ...json,
      ...JSON.parse(req.query.data)
    }

  }

  res.json(json);
});

module.exports = router;