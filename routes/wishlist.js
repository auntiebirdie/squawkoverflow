const API = require('../helpers/api.js');
const Middleware = require('../helpers/middleware.js');

const express = require('express');
const router = express.Router();

router.get('/', Middleware.isLoggedIn, (req, res, next) => {
  res.redirect(`/wishlist/${req.session.user}`);
});

router.get('/mine', Middleware.isLoggedIn, (req, res, next) => {
  res.redirect(`/wishlist/${req.session.user}`);
});

router.get('/:member', async (req, res, next) => {
  let member = await API.call('member', 'GET', {
	  id: req.params.member,
	  include: ['hasWishlist']
  });;

  if (req.params.member == req.session.user) {
	  res.set('Cache-Control', 'no-store');

    member.baitUsed = await API.call('counters', 'GET', {
      member: member.id,
      kind: 'bait'
    });
  } else {
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
    allFamilies: await API.call('families', 'GET'),
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
      label: 'In My Aviary',
    }, {
      id: 'unhatched',
      label: 'Not In My Aviary'
    }, {
      id: 'somewhere',
      label: "In Someone's Aviary"
    }]
  });
});

module.exports = router;
