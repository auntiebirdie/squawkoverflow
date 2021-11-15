const Birds = require('../../helpers/birds.js');
const BirdyPets = require('../../helpers/birdypets.js');
const Cache = require('../../helpers/cache.js');
const Members = require('../../helpers/members.js');
const Middleware = require('../../helpers/middleware.js');

const express = require('express');
const router = express.Router();

const birdsPerPage = 24;

router.get('/:member', Middleware.entityExists, async (req, res) => {
  let page = --req.query.page * birdsPerPage;

  let birds = await Members.fetchWishlist(req.entities['member']._id, req.query.family);

  let output = [];

  if (req.query.search) {
    birds = birds.filter((bird) => bird.commonName.toLowerCase().includes(req.query.search.toLowerCase()) || bird.nickname?.toLowerCase().includes(req.query.search.toLowerCase()));
  }

  let totalPages = birds.length;

  birds.sort((a, b) => a.commonName.localeCompare(b.commonName));

  for (let i = page, len = Math.min(page + birdsPerPage, birds.length); i < len; i++) {
    birds[i].hatched = req.session.user ? await Cache.get(`species-${birds[i].speciesCode}`, req.session.user, "s").then((response) => response.length > 0) : false;

    birds[i].variants = BirdyPets.findBy('speciesCode', birds[i].speciesCode).filter((birdypet) => !birdypet.special);

    output.push(birds[i]);
  }

  res.json({
    totalPages: Math.ceil(totalPages / birdsPerPage),
    results: output
  });
});

router.post('/:action/:speciescode', Middleware.isLoggedIn, async (req, res) => {
  let bird = Birds.findBy('speciesCode', req.params.speciescode);

  if (bird) {
    await Members.updateWishlist(req.session.user, req.params.action == "add" ? "add" : "remove", bird);

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
