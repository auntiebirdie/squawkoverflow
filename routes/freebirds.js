const API = require('../helpers/api.js');
const Middleware = require('../helpers/middleware.js');

const express = require('express');
const router = express.Router();

router.get('/', Middleware.isLoggedIn, async (req, res) => {
  res.render('freebirds/index', {
    currentPage: (req.query.page || 1) * 1,
    sidebar: 'filters',
    sortFields: [{
        value: 'freedAt-DESC',
        label: 'Freed At (Newest)'
      }, {
        value: 'freedAt-ASC',
        label: 'Freed At (Oldest)'
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
      id: 'hatched',
      label: 'In My Aviary',
    }, {
      id: 'unhatched',
      label: 'Not In My Aviary'
    }, {
      id: 'wishlisted',
      label: 'In My Wishlist'
    }]
  });
});

module.exports = router;
