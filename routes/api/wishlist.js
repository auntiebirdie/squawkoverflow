const Birds = require('../../helpers/birds.js');
const BirdyPets = require('../../helpers/birdypets.js');
const Cache = require('../../helpers/cache.js');
const Middleware = require('../../helpers/middleware.js');
const Redis = require('../../helpers/redis.js');

const chance = require('chance').Chance();
const express = require('express');
const router = express.Router();

const birdsPerPage = 24;

router.get('/:member', Middleware.entityExists, async (req, res) => {
  var page = --req.query.page * birdsPerPage;
  var birds = await Redis.get('wishlist', req.entities['member']._id).then((birds) => birds.map((bird) => Birds.findBy('speciesCode', bird))) || [];
  var output = [];

  if (req.query.family) {
    birds = birds.filter((bird) => bird.family.toLowerCase() == req.query.family.toLowerCase());
  }

  if (req.query.search) {
    birds = birds.filter((bird) => bird.commonName.toLowerCase().includes(req.query.search.toLowerCase()) || bird.nickname?.toLowerCase().includes(req.query.search.toLowerCase()));
  }

  var totalPages = birds.length;

  birds.sort((a, b) => a.commonName.localeCompare(b.commonName));

  for (var i = page, len = Math.min(page + birdsPerPage, birds.length); i < len; i++) {
    birds[i].hatched = req.session.user ? await Cache.get(`species-${birds[i].speciesCode}`, req.session.user, "s").then( (response) => response.length > 0) : false;

    birds[i].variants = BirdyPets.findBy('speciesCode', birds[i].speciesCode).filter((birdypet) => !birdypet.special);

    output.push(birds[i]);
  }

  res.json({
    totalPages: Math.ceil(totalPages / birdsPerPage),
    results: output
  });
});

router.post('/:action/:speciescode', Middleware.isLoggedIn, async (req, res) => {
  var bird = Birds.findBy('speciesCode', req.params.speciescode);

  if (bird) {
    Redis[req.params.action == "add" ? "push" : "pop"]('wishlist', req.session.user, bird.speciesCode);

    res.json({
      response: "success"
    });
  } else {
    res.json({
      error: "not found"
    });
  }
});

module.exports = router;
