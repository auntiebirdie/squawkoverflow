const API = require('../helpers/api.js');

const express = require('express');
const router = express.Router();

router.get('/', async (req, res) => {
  var families = require('../public/data/families.json');

  res.render('birdypedia', {
    families: families.map((family) => family.value),
    currentPage: (req.query.page || 1) * 1,
	  sidebar: "filter"
  });
});

router.get('/eggs/:letter([A-Za-z]{1})?', async (req, res) => {
  var letter = req.params.letter ? req.params.letter.toLowerCase() : 'a';

  API.call('eggs', 'GET', {
    loggedInUser: req.session.user,
    firstLetter: letter
  }).then((eggs) => {
    res.render('birdypedia/eggs', {
      eggs: eggs,
      firstLetter: letter.toUpperCase()
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
    loggedInUser: req.session.user,
    speciesCode: req.params.code,
    include: ['members']
  }).then((bird) => {
    if (bird && bird.illustrations.length > 0) {
      var selectedVariant = req.query.variant;

      res.render('birdypedia/bird', {
        page: 'birdypedia/bird',
        bird: bird
      });
    } else {
      res.redirect('/birdypedia');
    }
  });
});

module.exports = router;
