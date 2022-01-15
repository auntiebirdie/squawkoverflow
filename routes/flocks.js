const API = require('../helpers/api.js');
const Middleware = require('../helpers/middleware.js');

const express = require('express');
const router = express.Router();

router.get('/', Middleware.isLoggedIn, async (req, res) => {
  let flocks = await API.call('flocks', 'GET', {
    id: req.session.user
  });

  res.render('flocks/index', {
    flocks: flocks
  });
});

router.get('/new', Middleware.isLoggedIn, async (req, res) => {
  res.render('flocks/new');
});

router.get('/:flock/manage', Middleware.isLoggedIn, async (req, res) => {
  var flock = await API.call('flock', 'GET', {
    id: req.params.flock
  });

  if (flock.member != req.session.user) {
    return res.redirect('/flocks');
  }

  var member = await API.call('member', 'GET', {
    id: req.session.user,
    include: ['families', 'flocks']
  });

  res.render('flocks/manage', {
    page: "manageFlock",
    member: member,
    flock: flock,
    flocks: member.flocks,
    families: member.families,
    selectedFlock: flock.id,
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
    extraInsights: member.id == req.session.user ? [{
      id: 'duplicates',
      label: 'Duplicates'
    }] : [{
      id: 'hatched',
      label: "Birds I have",
    }, {
      id: 'unhatched',
      label: "Birds I don't have"
    }, {
      id: 'wishlisted',
      label: "Birds on my wishlist"
    }]
  });
});

router.get('/:flock', async (req, res) => {
  let flock = await API.call('flock', 'GET', {
    id: req.params.flock,
    include: ['families']
  });

  let member = await API.call('member', 'GET', {
    id: flock.member
  });

	console.log(flock.families);

  res.render('flocks/flock', {
    page: 'flock',
    member: member,
    flock: flock,
    families: flock.families,
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
    extraInsights: member.id == req.session.user ? [{
      id: 'duplicated',
      label: 'Duplicates'
    }] : [{
      id: 'hatched',
      label: "Birds I have",
    }, {
      id: 'unhatched',
      label: "Birds I don't have"
    }, {
      id: 'wishlisted',
      label: "Birds on my wishlist"
    }]
  });
});

module.exports = router;
