const helpers = require('../helpers');
const express = require('express');
const router = express.Router();

router.get('/mine', helpers.Middleware.isLoggedIn, (req, res, next) => {
  res.redirect(`/aviary/${req.session.user.id}`);
});

router.get('/:id', helpers.Middleware.entityExists, async (req, res, next) => {
  var allFamilies = require('../public/data/families.json');

  var families = new Set();

  var flocks = await helpers.Redis.fetch({
    "kind": "flock",
    "filters": [
	    { field : "member", value: req.entity._id }
    ]
  });

  var userpets = await helpers.UserPets.fetch([{
    field: "member",
    value: req.entity._id
  }]).then((userpets) => {
    return userpets.map((userpet) => {
      families.add(allFamilies.find((a) => a.value == userpet.birdypet.species.family));

      return {
        ...userpet,
        flocks: userpet.flocks.filter((id) => flocks.find((flock) => flock._id == id))
      };
    });
  });

  res.render('aviary/index', {
    page: 'aviary',
    member: req.entity,
    userpets: userpets,
    flocks: flocks,
    families: [...families].sort((a, b) => a.value.localeCompare(b.value))
  });
});

module.exports = router;
