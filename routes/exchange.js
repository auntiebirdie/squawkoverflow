const Middleware = require('../helpers/middleware.js');

const API = require('../helpers/api.js');

const express = require('express');
const router = express.Router();

router.get('/', Middleware.isLoggedIn, async (req, res) => {
  res.render('exchange/index', {
    currentPage: (req.query.page || 1) * 1
  });
});

router.get('/:id', Middleware.isLoggedIn, async (req, res) => {
  let viewAs = req.query.viewAs == "them" ? "them" : "me";

  let exchange = await API.call('exchanges', 'GET', {
    id: req.params.id,
    loggedInUser: req.session.user,
    viewAs: viewAs,
    include: ['logs']
  });

  if (exchange.memberA != req.session.user && exchange.memberB != req.session.user) {
    res.status(404);
    return res.render('error/404', {
      error: true
    });
  }

  res.render('exchange/proposal', {
    exchange: exchange,
    viewAs: viewAs,
    offers: ['this', 'one of these', 'any of these', 'all of these', 'anything'],
  });
});

router.get('/:member/new', Middleware.isLoggedIn, async (req, res) => {
  let exchange = await API.call('exchanges', 'PUT', {
    member: req.params.member,
    loggedInUser: req.session.user
  });

  res.redirect(`/exchange/${exchange}`);
});

router.get(['/:id/offer', '/:id/request'], Middleware.isLoggedIn, async (req, res) => {
  let exchange = await API.call('exchanges', 'GET', {
    id: req.params.id,
    loggedInUser: req.session.user
  });

  if (exchange.mutable) {
    let page = `exchange/${req.path.split('/').pop()}`;

    let member = await API.call('member', 'GET', {
      id: page == "exchange/offer" ? req.session.user : exchange.member.id,
      include: ['families', 'flocks']
    });

    var families = await API.call('families', 'GET');

    res.render('exchange/add', {
      page: page,
      exchange: exchange,
      member: member,
      allFamilies: families,
      families: member.families.filter((family) => family.owned > 0).map((family) => family.name),
      flocks: member.flocks.filter((flock) => !flock.protected && (member.id == req.session.user || !flock.private)),
      currentPage: (req.query.page || 1) * 1,
      sidebar: 'filters',
      sortFields: ['hatchedAt-DESC', 'hatchedAt-ASC', 'commonName-ASC', 'commonName-DESC', 'scientificName-ASC', 'scientificName-DESC'],
      filters: page == "exchange/offer" ? ['exchange', 'unexchange', 'wanted-Their', 'needed-Their'] : ['exchange', 'unexchange', 'wanted-My', 'needed-My'],
      extraFilters: page == "exchange/offer" ? ['unhatched-Their', 'isolated-My', 'duplicated-My'] : ['unhatched-My', 'isolated-Their', 'duplicated-Their']
    });
  } else {
    res.redirect(`/exchange/${exchange.id}`);
  }
});

module.exports = router;
