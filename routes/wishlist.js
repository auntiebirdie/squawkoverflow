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
    member.baitUsed = await API.call('counters', 'GET', {
      member: member.id,
      kind: 'bait'
    });
  } else {
    if (!member.settings || member.settings.privacy_wishlist) {
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
    title: `Wishlist | ${member.username}`,
    page: 'wishlist',
    member: member,
    allFamilies: await API.call('families', 'GET'),
    families: families,
    currentPage: (req.query.page || 1) * 1,
    sidebar: 'filters',
    searchFields: [{
      id: 'commonName',
      name: 'Common Name'
    }, {
      id: 'scientificName',
      name: 'Scientific Name'
    }],
    sortFields: ['commonName-ASC', 'commonName-DESC', 'scientificName-ASC', 'scientificName-DESC', 'addedAt-DESC', 'addedAt-ASC'],
    filters: req.session.user == req.params.member ? ['hatched-My', 'unhatched-My', 'somewhere'] : ['hatched-My', 'duplicated-My']
  });
});

module.exports = router;
