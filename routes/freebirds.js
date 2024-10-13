const API = require('../helpers/api.js');
const Middleware = require('../helpers/middleware.js');

const Families = require('../collections/families.js');

const express = require('express');
const router = express.Router();

router.get('/', Middleware.isLoggedIn, async (req, res) => {
      let families = await API.call('freebirds', 'HEAD');

  res.render('freebirds/index', {
    title: 'Free Birds',
    page: 'freebirds',
    currentPage: (req.query.page || 1) * 1,
    sidebar: 'filters',
        allFamilies: await Families.all(),
        families: families,
    searchFields: [{
      id: 'commonName',
      name: 'Common Name'
    }, {
      id: 'scientificName',
      name: 'Scientific Name'
    }],
    sortFields: ['freedAt-DESC', 'freedAt-ASC', 'commonName-ASC', 'commonName-DESC', 'scientificName-ASC', 'scientificName-DESC'],
    filters: ['copied', 'wanted-My', 'needed-My', 'unhatched-My', 'isolated-My', 'duplicated-My']
  });
});

module.exports = router;
