const Middleware = require('../helpers/middleware.js');

const API = require('../helpers/api.js');

const express = require('express');
const router = express.Router();

router.get('/mine', Middleware.isLoggedIn, (req, res, next) => {
  res.redirect(`/aviary/${req.session.user}`);
});

router.get('/:member', async (req, res, next) => {
  API.call('member', 'GET', {
    id: req.params.member,
    flocks: true,
    families: true
  }).then((member) => {
    res.render('aviary/index', {
      page: 'aviary',
      member: member,
      families: member.families,
      flocks: member.flocks,
      currentPage: (req.query.page || 1) * 1
    });
  });
});

module.exports = router;
