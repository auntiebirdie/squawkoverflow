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
    res.redirect('/error');
  }

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

    res.render('exchange/add', {
      page: page,
      exchange: exchange,
      allFamilies: families,
      families: member.families.filter((family) => family.owned > 0).map((family) => family.name),
      flocks: member.flocks,
      currentPage: (req.query.page || 1) * 1,
      sidebar: 'filters',
      sortFields: [{
          value: 'hatchedAt-DESC',
          label: 'Hatch Date (Newest)'
        }, {
          value: 'hatchedAt-ASC',
          label: 'Hatch Date (Oldest)'
        }, {
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
          id: 'duplicated',
          label: `${page == 'exchange/offer' ? 'I' : 'They'} Have Multiple`
        }, {
          id: 'unhatched',
          label: `Not In ${page == 'exchange/offer' ? 'Their' : 'My'} Aviary`
        },
        {
          id: 'wanted',
          label: `In ${page == 'exchange/offer' ? 'Their' : 'My'}  Wishlist (Want It)`
        }, {
          id: 'needed',
          label: `In ${page == 'exchange/offer' ? 'Their' : 'My' } Wishlist (Need It)`
        }
      ]
    });
  } else {
    res.redirect(`/exchange/${exchange.id}`);
  }
});

module.exports = router;
