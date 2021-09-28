const helpers = require('../helpers');
const express = require('express');
const router = express.Router();

router.get('/mine', helpers.Middleware.isLoggedIn, (req, res, next) => {
  res.redirect(`/aviary/${req.session.user.id}`);
});

router.get('/:id', helpers.Middleware.entityExists, async (req, res, next) => {
  var families = new Set();

  var userpets = await helpers.DB.fetch({
    "kind": "MemberPet",
    "filters": [
      ["member", "=", req.entity._id]
    ],
    "order": ["hatchedAt", {
      "descending": true
    }]
  }).then((userpets) => {
    return userpets.map((userpet) => {
      let birdypet = helpers.BirdyPets.fetch(userpet.birdypet);

      families.add(birdypet.species.family);

      return {
        id: userpet._id,
        nickname: userpet.nickname,
        hatchedAt: userpet.hatchedAt,
        flocks: userpet.flocks || [],
        birdypet: birdypet
      }
    });
  });

  var flocks = await helpers.DB.fetch({
    "kind": "MemberFlock",
    "filters": [
      ["member", "=", req.entity._id]
    ],
    "order": ["displayOrder"]
  });

  res.render('aviary/index', {
    member: req.entity,
    userpets: userpets,
    flocks: flocks,
    families: [...families].sort((a, b) => a.localeCompare(b))
  });
});

module.exports = router;
