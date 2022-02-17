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
  let exchange = await API.call('exchanges', 'GET', {
    id: req.params.id,
    loggedInUser: req.session.user,
    include: ['logs']
  });

  if (exchange.memberA != req.session.user && exchange.memberB != req.session.user) {
    res.status(404);
    return res.render('error/404', {
      error: true
    });
  }

  req.io.on('connection', (socket) => {
    socket.on('loaded', () => {
      socket.join(`exchange/${req.params.id}/${req.session.user}`);
    });

    socket.on('update', (data) => {
      socket.to(`exchange/${req.params.id}/${exchange.member.id}`).emit('update', data);
    });
  });

  res.set('Cache-Control', 'no-store');

  res.render('exchange/proposal', {
    exchange: exchange,
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

    req.io.on('connection', (socket) => {
      socket.on('update', (data) => {
        socket.to(`exchange/${req.params.id}/${exchange.member.id}`).emit('update', data);
      });
    });

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
      extraInsights: page == "exchange/offer" ? ['unhatched-Their', 'isolated-My', 'duplicated-My', 'wanted-Their', 'needed-Their'] : ['unhatched-My', 'isolated-Their', 'duplicated-Their', 'wanted-My', 'needed-My'],
    });
  } else {
    res.redirect(`/exchange/${exchange.id}`);
  }
});

module.exports = router;
