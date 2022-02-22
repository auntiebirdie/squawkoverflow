const API = require('../helpers/api.js');
const Middleware = require('../helpers/middleware.js');

const express = require('express');
const router = express.Router();

router.get('/', Middleware.isLoggedIn, async (req, res) => {
  res.render('freebirds/index', {
    page: 'freebirds',
    currentPage: (req.query.page || 1) * 1,
    sidebar: 'filters',
    sortFields: ['freedAt-DESC', 'freedAt-ASC', 'commonName-ASC', 'commonName-DESC', 'scientificName-ASC', 'scientificName-DESC'],
    filters: ['copied', 'wanted-My', 'needed-My'],
    extraFilters: ['unhatched-My', 'isolated-My', 'duplicated-My']
  });
});

module.exports = router;
