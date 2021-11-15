const Birds = require('../helpers/birds.js');
const BirdyPets = require('../helpers/birdypets.js');
const Cache = require('../helpers/cache.js');
const MemberPets = require('../helpers/memberpets.js');
const Members = require('../helpers/members.js');
const Middleware = require('../helpers/middleware.js');
const Redis = require('../helpers/redis.js');

const chance = require('chance').Chance();
const express = require('express');
const router = express.Router();

const birdsPerPage = 24;

router.get('/', async (req, res) => {
  var page = --req.query.page * birdsPerPage;
  var wishlist = req.session.user ? await Cache.get('wishlist', req.session.user) : [];
  var output = [];

  if (req.query.family) {
    var birds = Birds.fetch("family", req.query.family);
  } else {
    var birds = Birds.all().filter((bird) => req.query.adjectives ? bird.adjectives.includes(req.query.adjectives) : true);
  }

  if (req.query.search) {
    birds = birds.filter((bird) => bird.commonName.toLowerCase().includes(req.query.search.toLowerCase()));
  }

  var totalPages = birds.length;

  birds.sort((a, b) => a.commonName.localeCompare(b.commonName));

  for (var i = page, len = Math.min(page + birdsPerPage, birds.length); i < len; i++) {
    birds[i].wishlisted = wishlist[birds[i].family] ? wishlist[birds[i].family].includes(birds[i].speciesCode) : false;
    birds[i].variants = BirdyPets.findBy('speciesCode', birds[i].speciesCode).filter((birdypet) => !birdypet.special);

    if (req.session.user) {
      for (var variant of birds[i].variants) {
        await Redis.fetch('memberpet', {
          'FILTER': `@member:{${req.session.user}} @birdypetId:{${variant.id}}`,
          'COUNT': true
        }).then((response) => {
          variant.hatched = response.count;
        });
      }

      if (birds[i].variants.length > 0) {
        birds[i].variants.sort((a, b) => Number(b.hatched) - Number(a.hatched));
      } else {
        birds[i].SKIP = true;
      }
    }

    if (birds[i].variants.length > 0) {
      output.push(birds[i]);
    }
  }

  res.json({
    totalPages: Math.ceil(totalPages / birdsPerPage),
    results: output
  });
});

router.get('/eggs', async (req, res) => {
  var page = req.query.page;

	var output = [];

  res.sjon({
	  totalPages: 26,
	  results: output
  });
});

module.exports = router;
