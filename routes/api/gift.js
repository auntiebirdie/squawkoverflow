const BirdyPets = require('../../helpers/birdypets.js');
const Cache = require('../../helpers/cache.js');
const MemberPets = require('../../helpers/memberpets.js');
const Members = require('../../helpers/members.js');
const Middleware = require('../../helpers/middleware.js');
const Redis = require('../../helpers/redis.js');
const Webhook = require('../../helpers/webhook.js');

const express = require('express');
const router = express.Router();

const birdsPerPage = 24;

router.get('/:member', Middleware.isLoggedIn, Middleware.entityExists, (req, res) => {
  var page = --req.query.page * birdsPerPage;
  var filters = [
    `@member:{${req.session.user}}`,
    req.query.family ? `@family:${req.query.family}` : '',
    req.query.flock ? `@flocks:{${req.query.flock}}` : '',
    req.query.search ? `@nickname|species:${Redis.escape(req.query.search)}` : ''
  ].join(' ');

  Redis.fetch('memberpet', {
    'FILTER': filters,
    'SORTBY': req.query.sort,
    'LIMIT': [page, birdsPerPage]
  }).then(async (response) => {
    var wishlist = await Cache.get('wishlist', req.entities['member']._id);
    var output = [];

    for (var memberpet of response.results) {
      var owned = await Redis.fetch('memberpet', {
        'FILTER': `@member:{${req.entities['member']._id}} @birdypetSpecies:{${memberpet.birdypetSpecies}}`,
        'RETURN': ['birdypetId']
      }).then((owned) => owned.results.map((birdypet) => birdypet.birdypetId));

      output.push({
        ...MemberPets.format(memberpet),
        wishlisted: wishlist[memberpet.family] ? wishlist[memberpet.family].includes(memberpet.birdypetSpecies) : false,
        checkmark: owned.includes(memberpet.birdypetId) ? 2 : (owned.length > 0 ? 1 : 0)
      });
    }

    res.json({
      totalPages: Math.ceil(response.count / birdsPerPage),
      results: output
    });
  });
});

module.exports = router;
