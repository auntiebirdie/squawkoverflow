const API = require('../helpers/api.js');
const Middleware = require('../helpers/middleware.js');

const express = require('express');
const router = express.Router();

router.get('/', Middleware.isLoggedIn, async (req, res) => {
  let flocks = await API.call('flocks', 'GET', {
    id: req.session.user
  });

  res.render('flocks/index', {
    flocks: flocks
  });
});

router.get('/new', Middleware.isLoggedIn, async (req, res) => {
  res.render('flocks/new');
});

router.get('/:flock/manage', Middleware.isLoggedIn, async (req, res) => {
  var flock = await API.call('flock', 'GET', {
    id: req.params.flock
  });

  if (flock.member != req.session.user) {
    return res.redirect('/flocks');
  }

  var member = await API.call('member', 'GET', {
    id: req.session.user,
    include: ['families', 'flocks']
  });

  res.render('flocks/manage', {
    page: "manageFlock",
    member: member,
    flock: flock,
    flocks: member.flocks,
    families: member.families
  });
});

router.get('/:flock', async (req, res) => {
  let flock = await API.call('flock', 'GET', {
    id: req.params.flock,
    include: ['families']
  });

  let member = await API.call('member', 'GET', {
    id: flock.member
  });

  res.render('flocks/flock', {
    page: 'flock',
    member: member,
    flock: flock,
    families: flock.families
  });
});

module.exports = router;
