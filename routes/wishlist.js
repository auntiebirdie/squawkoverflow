const API = require('../helpers/api.js');
const Middleware = require('../helpers/middleware.js');

const express = require('express');
const router = express.Router();

router.get('/mine', Middleware.isLoggedIn, (req, res, next) => {
  res.redirect(`/wishlist/${req.session.user}`);
});

router.get('/:member', async (req, res, next) => {
  let member = null;

  if (req.params.member == req.session.user) {
    member = res.locals.loggedInUser;
  } else {
    member = await API.call('member', 'GET', {
      id: req.params.member
    });

    if (member.settings.privacy?.includes('wishlist')) {
      return res.redirect('/error');
    }
  }

  let families = await API.call('wishlist', 'HEAD', {
    id: req.params.member
  });

  res.render('wishlist/index', {
    page: 'wishlist',
    member: member,
    families: families,
    currentPage: (req.query.page || 1) * 1,
    sidebar: 'filters',
    sortFields: [{
        value: 'commonName-ASC',
        label: 'Common Name (A-Z)'
      },
      {
        value: 'commonName-DESC',
        label: 'Common Name (Z-A)'
      },
      {
        value: 'scientificName-ASC',
        label: 'Scientific Name (A-Z)'
      },
      {
        value: 'scientificName-DESC',
        label: 'Scientific Name (Z-A)'
      }
    ],
    extraInsights: [{
      id: 'hatched',
      label: 'Hatched species',
    }, {
      id: 'unhatched',
      label: 'Unhatched species'
    }]
  });
});

module.exports = router;
