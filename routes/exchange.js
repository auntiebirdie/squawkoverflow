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

  res.render('exchange/proposal', {
    exchange: exchange
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

    res.render('exchange/add', {
      page: page,
      exchange: exchange,
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
