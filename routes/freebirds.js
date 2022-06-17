const API = require('../helpers/api.js');
const Middleware = require('../helpers/middleware.js');

const express = require('express');
const router = express.Router();

router.get('/', Middleware.isLoggedIn, async (req, res) => {
  res.render('freebirds/index', {
    title: 'Free Birds',
    page: 'freebirds',
    currentPage: (req.query.page || 1) * 1,
    sidebar: 'filters',
	  searchFields: [{ id : 'cleanName', name : 'Common Name' }, { id : 'scientificName', name : 'Scientific Name' }],
    sortFields: ['freedAt-DESC', 'freedAt-ASC', 'commonName-ASC', 'commonName-DESC', 'scientificName-ASC', 'scientificName-DESC'],
    filters: ['copied', 'wanted-My', 'needed-My'],
    extraFilters: ['unhatched-My', 'isolated-My', 'duplicated-My']
  });
});

module.exports = router;
