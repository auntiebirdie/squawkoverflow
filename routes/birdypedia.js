const API = require('../helpers/api.js');
const Middleware = require('../helpers/middleware.js');

const fs = require('fs');
const express = require('express');
const router = express.Router();

router.get('/', async (req, res) => {
  var families = await API.call('families', 'GET');
  var artists = await API.call('artists', 'GET');

  res.render('birdypedia', {
    title: 'Birdypedia',
    page: 'birdypedia',
    allFamilies: families,
    families: families.map((family) => family.name),
    artists: artists,
    currentPage: (req.query.page || 1) * 1,
    sidebar: 'filters',
    sortFields: ['commonName-ASC', 'commonName-DESC', 'scientificName-ASC', 'scientificName-DESC', 'variants-DESC'],
    filters: ['unwishlisted-My', 'wanted-My', 'needed-My'],
    extraFilters: ['unhatched-My', 'isolated-My', 'duplicated-My', 'somewhere']
  });
});

router.get('/eggs/:letter([A-Za-z]{1})?', async (req, res) => {
  var letter = req.params.letter ? req.params.letter.toUpperCase() : 'A';

  API.call('eggs', 'GET', {
    loggedInUser: req.session.user,
    search: letter,
    include: ['memberData']
  }).then((eggs) => {
    res.render('birdypedia/eggs', {
      title: `Eggs - ${letter} | Birdypedia`,
      page: "birdypedia",
      eggs: eggs,
      selectedLetter: letter,
      sidebar: "eggs"
    });
  });
});

router.get('/eggs/:egg', async (req, res) => {
  API.call('eggs', 'GET', {
    loggedInUser: req.session.user,
    adjective: req.params.egg
  }).then(([egg]) => {
    if (egg) {
      res.render('birdypedia/egg', {
        title: `${egg.adjective.charAt(0).toUpperCase() + egg.adjective.slice(1)} Egg | Birdypedia`,
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
      res.redirect(`/birdypedia/bird/${req.params.code}`);
    }
  });
});

router.get('/bird/:code', async (req, res) => {
  API.call('bird', 'GET', {
    loggedInUser: req.session.user,
    speciesCode: req.params.code,
    include: ['members']
  }).then(async (bird) => {
    if (bird && bird.variants.length > 0) {
      let eggs = [];

      if (req.session.user && (res.locals.loggedInUser.admin || res.locals.loggedInUser.contributor)) {
        eggs = await API.call('eggs', 'GET');
      }

      res.render('birdypedia/bird', {
        title: `${bird.commonName} | Birdypedia`,
        page: 'birdypedia/bird',
        bird: bird,
	variant: bird.variants.find((variant) => `${variant.prefix}-${variant.alias}` == req.query.variant) || bird.variants.find((variant) => variant.hatched) || bird.variants[0],
        sidebar: 'bird',
        eggs: eggs
      });
    } else {
      res.redirect('/birdypedia');
    }
  });
});

module.exports = router;
