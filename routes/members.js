const API = require('../helpers/api.js');
const Middleware = require('../helpers/middleware.js');

const express = require('express');
const router = express.Router();

router.get('/', async (req, res) => {
  let members = await API.call('members');

  res.render('members/index', {
    members: members
  });
});

router.get('/:member', async (req, res) => {
  API.call('member', "GET", {
    id: req.params.member,
    profile: true
  }).then(async (member) => {
    if (member.id != req.session.user && member.settings?.privacy?.includes('profile')) {
      return res.redirect('/error');
    }

    res.render('members/member', {
      page: 'member',
      member: member
    });
  });
});

router.get('/:member/gift', Middleware.isLoggedIn, async (req, res) => {
  API.call('member', 'GET', {
    id: req.params.member,
    flocks: true,
    families: true
  }).then(async (member) => {
    if (member.settings.privacy?.includes('gifts')) {
      return res.redirect('/error');
    }

    res.render('members/gift', {
      page: 'gift',
      member: member,
      flocks: member.flocks,
      families: member.families,
      currentPage : (req.query.page || 1) * 1
    });
  });
});

module.exports = router;
