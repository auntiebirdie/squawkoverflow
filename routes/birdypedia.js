const API = require('../helpers/api.js');

const express = require('express');
const router = express.Router();

router.get('/', async (req, res) => {
  var families = require('../public/data/families.json');

  res.render('birdypedia', {
    page: 'birdypedia',
    families: families.map((family) => family.value),
    currentPage: (req.query.page || 1) * 1,
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
    extraInsights: [{
      id: 'hatched',
      label: 'Hatched species',
    }, {
      id: 'unhatched',
      label: 'Unhatched species'
    }]
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
  var egg = require('../public/data/eggs.json')[req.params.egg];

  if (egg) {
    egg.name = req.params.egg;

    res.render('birdypedia/egg', {
      page: 'birdypedia',
      egg: egg,
      currentPage: (req.query.page || 1) * 1,
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
      extraInsights: [{
        id: 'hatched',
        label: 'In My Aviary',
      }, {
        id: 'unhatched',
        label: 'Not In My Aviary'
      }, {
        id: 'somewhere',
        label: "In Someone's Aviary"
      }, {
        id: 'wishlisted',
        label: 'In My Wishlist'
      }]
    });
  } else {
    res.redirect('/error');
  }
});

router.get('/bird/:code', async (req, res) => {
  API.call('bird', 'GET', {
    loggedInUser: req.session.user,
    speciesCode: req.params.code,
    include: ['members']
  }).then((bird) => {
    if (bird && bird.variants.length > 0) {
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