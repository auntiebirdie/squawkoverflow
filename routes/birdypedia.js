const API = require('../helpers/api.js');
const Middleware = require('../helpers/middleware.js');

const fs = require('fs');
const express = require('express');
const router = express.Router();

router.get('/', async (req, res) => {
  var families = await API.call('families', 'GET');
  var artists = await API.call('artists', 'GET');

  res.render('birdypedia', {
    page: 'birdypedia',
    allFamilies: families,
    families: families.map((family) => family.name),
    artists: artists,
    currentPage: (req.query.page || 1) * 1,
    sidebar: 'filters',
    sortFields: ['commonName-ASC', 'commonName-DESC', 'scientificName-ASC', 'scientificName-DESC'],
    filters: ['unwishlisted-My', 'wanted-My', 'needed-My'],
    extraFilters: ['unhatched-My', 'isolated-My', 'duplicated-My', 'somewhere']
  });
});

router.get('/eggs/:letter([A-Za-z]{1})?', async (req, res) => {
  var letter = req.params.letter ? req.params.letter.toLowerCase() : 'a';

  API.call('eggs', 'GET', {
    loggedInUser: req.session.user,
    firstLetter: letter
  }).then((eggs) => {
    res.render('birdypedia/eggs', {
      page: "birdypedia",
      eggs: eggs,
      selectedLetter: letter.toUpperCase(),
      sidebar: "eggs"
    });
  });
});

router.get('/eggs/:egg', async (req, res) => {
  API.call('eggs', 'GET', {
    loggedInUser: req.session.user,
    adjective: req.params.egg
  }).then((egg) => {
    if (egg) {
      res.render('birdypedia/egg', {
        page: 'birdypedia',
        egg: egg,
        currentPage: (req.query.page || 1) * 1,
        sidebar: 'filters',
        sortFields: ['commonName-ASC', 'commonName-DESC', 'scientificName-ASC', 'scientificName-DESC'],
	filters: ['unwishlisted-My', 'wanted-My', 'needed-My'],
        extraFilters: ['unhatched-My', 'isolated-My', 'duplicated-My', 'somewhere']
      });
    } else {
      res.redirect('/error');
    }
  });
});

router.get('/bird/:code/variant/:variant', Middleware.isContributor, async (req, res) => {
  API.call('bird', 'GET', {
    loggedInUser: req.session.user,
    speciesCode: req.params.code
  }).then((bird) => {
    if (bird) {
      res.render('birdypedia/variant', {
        bird: bird,
	variant: bird.variants.find((variant) => `${variant.prefix}-${variant.alias}` == req.params.variant)
      });
    } else {
      res.redirect('/birdypedia');
    }
  });
});

router.get('/bird/:code', async (req, res) => {
  API.call('bird', 'GET', {
    loggedInUser: req.session.user,
    speciesCode: req.params.code,
    include: ['members']
  }).then((bird) => {
    if (bird && bird.variants.length > 0) {
	    console.log(bird.variants);
      bird.variants.sort((a, b) => req.query.variant == `${a.prefix}-${a.alias}` ? -1 : 1);

      res.render('birdypedia/bird', {
        page: 'birdypedia/bird',
        bird: bird,
        sidebar: 'bird'
      });
    } else {
      res.redirect('/birdypedia');
    }
  });
});

module.exports = router;
