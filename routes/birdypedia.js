const API = require('../helpers/api.js');

const Birds = require('../helpers/birds.js');
const BirdyPets = require('../helpers/birdypets.js');
const Cache = require('../helpers/cache.js');
const Members = require('../helpers/members.js');

const express = require('express');
const router = express.Router();

router.get('/', async (req, res) => {
  var families = require('../public/data/families.json');

  res.render('birdypedia', {
    families: families.map((family) => family.value),
    currentPage: (req.query.page || 1) * 1
  });
});

router.get('/eggs', async (req, res) => {
  API.call('eggs', 'GET', {
    loggedInUser: req.session.user
  }).then((eggs) => {
    res.render('birdypedia/eggs', {
      eggs: eggs
    });
  });
});

router.get('/eggs/:egg', async (req, res) => {
  var egg = require('../public/data/eggs.json')[req.params.egg];

  if (egg) {
    egg.name = req.params.egg;

    res.render('birdypedia/egg', {
      egg: egg,
      currentPage: (req.query.page || 1) * 1
    });
  } else {
    res.redirect('/error');
  }
});

router.get('/bird/:code', async (req, res) => {
  API.call('bird', 'GET', {
    speciesCode: req.params.code,
    include: ['members']
  }).then((bird) => {
    if (bird && bird.variants.length > 0) {
      var selectedVariant = req.query.variant;

      res.render('birdypedia/bird', {
        page: 'birdypedia/bird',
        bird: bird,
        members: []
      });
    } else {
      res.redirect('/birdypedia');
    }
  });
});

module.exports = router;
