const helpers = require('../helpers');
const express = require('express');
const router = express.Router();

router.get('/', helpers.Middleware.isLoggedIn, async (req, res) => {
  var freebirds = await helpers.Redis.fetch({
    "kind": "freebird",
    "startAt": helpers.Chance.integer({
      min: 0,
      max: 50
    }),
    "limit": 20
  });

  if (freebirds.length == 0) {
    freebirds = await helpers.Redis.fetch({
      "kind": "freebird",
      "limit": 20
    });
  }

  var userpets = [];

  for (var i = 0, len = freebirds.length; i < len; i++) {
	  freebirds[i] = helpers.BirdyPets.fetch(freebirds[i]._id);

	  if (req.session.user) {
		  await helpers.Redis.fetchOne({
			  kind: 'memberpet',
			  filters: [
				  { field: 'member', value: req.session.user.id },
				  { field: 'birdypetSpecies', value : freebirds[i].species.speciesCode }
			  ]
		  }).then( (result) => {
			  if (result) {
				  userpets.push(freebirds[i].species.speciesCode);
			  }
		  });

		  await helpers.Redis.fetchOne({
			  kind: 'memberpet',
			  filters: [
				  { field: 'member', value: req.session.user.id },
				  { field: 'birdypetId', value: freebirds[i].id }
			  ]
		  }).then( (result) => {
			  if (result) {
				  userpets.push(freebirds[i].id);
			  }
		  });
	  }
  }

  res.render('freebirds/index', {
    birdypets: freebirds,
	  userpets: userpets
  });
});

module.exports = router;
