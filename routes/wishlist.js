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
    if (member.settings.privacy_wishlist) {
      return res.redirect('/error');
    }
  }

  let families = await API.call('wishlist', 'HEAD', {
    id: req.params.member
  });

  let timeUntilTommorrow = null;

  if (member.baitUsed) {
    let now = new Date();
    let midnight = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 24, 00);

    let seconds = (midnight - now.getTime()) / 1000;
    let minutes = Math.round(seconds / 60);
    let hours = Math.round(minutes / 60);

    if (hours > 1) {
      timeUntilTomorrow = `${hours} hours`;
    } else {
      timeUntilTomorrow = `${minutes} minutes`;
    }
  }

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
      },
      {
        value: 'addedAt-DESC',
        label: 'Added to List (Newest)'
      },
      {
        value: 'addedAt-ASC',
        label: 'Added to List (Oldest)'
      }
    ],
    extraInsights: req.session.user == req.params.member ? [{
      id: 'hatched',
      label: 'In My Aviary'
    }, {
      id: 'unhatched',
      label: 'Not In My Aviary'
    }, {
      id: 'somewhere',
      label: 'In Someone\'s Aviary'
    }] : [{
      id: 'hatched',
      label: 'In My Aviary',
    }, {
      id: 'unhatched',
      label: 'Not In My Aviary'
    }, {
      id: 'duplicated',
      label: 'I Have Multiple'
    }]
  });
});

module.exports = router;