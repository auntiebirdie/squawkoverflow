const Cache = require('../helpers/cache.js');
const Members = require('../helpers/members.js');

const API = require('../helpers/api.js');
const Redis = require('../helpers/redis.js');

const helpers = require('../helpers.js');
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
    full: true
  }).then(async (member) => {

    if (member.id != req.session.user && member.settings.privacy?.includes('profile')) {
      return res.redirect('/error');
    }

    res.render('members/member', {
      page: 'member',
      member: member
    });
  });
});

router.get('/:member/gift', helpers.Middleware.isLoggedIn, async (req, res) => {
  API.call('member', 'GET', {
    id: req.params.member
  }).then(async (member) => {
    if (member.settings.privacy?.includes('gifts')) {
      return res.redirect('/error');
    }

    var allFamilies = require('../public/data/families.json');
    var families = new Set();

    var flocks = await Redis.fetch('flock', {
      "FILTER": `@member:{${req.session.user}}`,
      "SORTBY": ["name", "DESC"]
    });

    await Redis.fetch('memberpet', {
      'FILTER': `@member:{${req.session.user}}`,
      'RETURN': ['family'],
    }).then((response) => {
      response.results.forEach((item) => {
        var family = allFamilies.find((a) => a.value == item.family);

        if (family) {
          families.add(family);
        }
      });
    });

    res.render('members/gift', {
      page: 'gift',
      member: member,
      flocks: flocks,
      families: [...families].sort((a, b) => a.value.localeCompare(b.value)),
      currentPage : (req.query.page || 1) * 1
    });
  });
});

module.exports = router;
