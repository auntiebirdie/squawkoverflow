const API = require('../helpers/api.js');
const Middleware = require('../helpers/middleware.js');

const fs = require('fs');
const express = require('express');
const router = express.Router();

router.get('/', async (req, res) => {
  var families = await API.call('families', 'GET');

  res.render('birdypedia', {
    title: 'Birdypedia',
    page: 'birdypedia',
    allFamilies: families,
    families: families.map((family) => family.name),
    currentPage: (req.query.page || 1) * 1,
    sidebar: 'filters',
    style: true,
    searchFields: [{
      id: 'cleanName',
      name: 'Common Name'
    }, {
      id: 'scientificName',
      name: 'Scientific Name'
    }],
    sortFields: ['commonName-ASC', 'commonName-DESC', 'scientificName-ASC', 'scientificName-DESC', 'variants-DESC'],
    filters: ['discovered', 'undiscovered', 'unwishlisted-My', 'wanted-My', 'needed-My', 'unhatched-My', 'isolated-My', 'duplicated-My']
  });
});

router.get('/eggs/:letter([A-Za-z]{1})?', (req, res) => {
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

router.get('/eggs/:egg', (req, res) => {
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
        searchFields: [{
          id: 'cleanName',
          name: 'Common Name'
        }, {
          id: 'scientificName',
          name: 'Scientific Name'
        }],
        sortFields: ['commonName-ASC', 'commonName-DESC', 'scientificName-ASC', 'scientificName-DESC'],
        filters: ['discovered', 'undiscovered', 'unwishlisted-My', 'wanted-My', 'needed-My', 'unhatched-My', 'isolated-My', 'duplicated-My']
      });
    } else {
      res.redirect('/error');
    }
  });
});

router.get('/artists', (req, res) => {
  res.render('birdypedia/artists', {
    title: 'Artists | Birdypedia',
    page: 'birdypedia',
    currentPage: (req.query.page || 1) * 1,
    sidebar: 'filters',
    style: true
  });
});

router.get('/artists/:artist', (req, res) => {
  API.call('artists', 'GET', {
    loggedInUser: req.session.user,
    artist: req.params.artist
  }).then(async (artist) => {
    if (artist) {
      let families = await API.call('artists', 'HEAD', {
        id: req.params.artist
      });

      res.render('birdypedia/artist', {
        title: `${artist.name} | Artists | Birdypedia`,
        page: 'birdypedia',
        artist: artist,
        currentPage: (req.query.page || 1) * 1,
        sidebar: 'filters',
        style: true,
        allFamilies: await API.call('families', 'GET'),
        families: families,
        searchFields: [{
          id: 'cleanName',
          name: 'Common Name'
        }, {
          id: 'scientificName',
          name: 'Scientific Name'
        }],
        sortFields: ['commonName-ASC', 'commonName-DESC', 'scientificName-ASC', 'scientificName-DESC'],
        filters: ['discovered', 'undiscovered', 'unwishlisted-My', 'wanted-My', 'needed-My', 'unhatched-My', 'isolated-My', 'duplicated-My']
      });
    } else {
      res.redirect('/error');
    }
  });
});

router.get('/bird/new', Middleware.isContributor, async (req, res) => {
  var families = await API.call('families', 'GET');

  res.render('birdypedia/new', {
    bird: null,
    families: families
  });
});

router.get('/bird/:id/variant/:variant', Middleware.isContributor, async (req, res) => {
  API.call('bird', 'GET', {
    loggedInUser: req.session.user,
    id: req.params.id,
    include: ['variants', 'creator', 'contributor']
  }).then(async (bird) => {
    if (bird) {
      res.render('birdypedia/variant', {
        bird: bird,
        variant: bird.variants.find((variant) => variant.id == req.params.variant),
        artists: await API.call('artists', 'GET').then((artists) => artists.map((artist) => artist.name))
      });
    } else {
      res.redirect(`/birdypedia/bird/${req.params.id}`);
    }
  });
});

router.get('/bird/:id/edit', Middleware.isContributor, async (req, res) => {
  API.call('bird', 'GET', {
    id: req.params.id
  }).then(async (bird) => {
    if (bird) {
      res.render('birdypedia/new', {
        bird: bird,
        families: await API.call('families', 'GET')
      });
    } else {
      res.redirect('/error');
    }
  });
});

router.get('/bird/:id', async (req, res) => {
  API.call('bird', 'GET', {
    loggedInUser: req.session.user,
    id: req.params.id
  }).then(async (bird) => {
    if (bird && bird.variants?.length > 0) {
      let eggs = [];

      if (req.session.user && (res.locals.loggedInUser.admin || res.locals.loggedInUser.contributor)) {
        eggs = await API.call('eggs', 'GET');
      }

      res.render('birdypedia/bird', {
        title: `${bird.commonName} | Birdypedia`,
        page: 'birdypedia/bird',
        bird: bird,
        variant: bird.variants.find((variant) => variant.id == req.query.variant) || bird.variants.find((variant) => !variant.special) || bird.variants[0],
        sidebar: 'bird',
        eggs: eggs,
        currentPage: (req.query.page || 1) * 1
      });
    } else {
      res.redirect('/birdypedia');
    }
  });
});

module.exports = router;
