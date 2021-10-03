const helpers = require('../helpers');
const express = require('express');
const router = express.Router();

router.get('/birdypedia/family/:family', async (req, res) => {
  var birdypets = helpers.BirdyPets.find('species.family', req.params.family.toLowerCase());

  res.json(birdypets);
});

router.get('/birdypedia/eggs/:adjective', async (req, res) => {
  var birdypets = helpers.BirdyPets.find('adjectives', req.params.adjective);

  res.json(birdypets);
});

router.get('/flocks/:flock/:memberpet', helpers.Middleware.isLoggedIn, helpers.Middleware.entityExists, helpers.Middleware.userOwnsEntity, (req, res) => {
  var index = req.entities['memberpet'].flocks ? req.entities['memberpet'].flocks.indexOf(req.entities['flock']._id) : -1;
  var flocks = req.entities['memberpet'].flocks ? req.entities['memberpet'].flocks : [];

  if (index !== -1) {
    flocks = flocks.splice(index, -1);
  } else {
    flocks.push(req.entities['flock']._id);
  }

  helpers.Redis.set('memberpet', req.entities['memberpet']._id, {
    flocks: flocks.join(',')
  }).then(() => {
    res.json({
      action: index !== -1 ? "remove" : "add"
    });
  });
});

router.get('/freebirds/:freebird', helpers.Middleware.isLoggedIn, async (req, res) => {
	var freebird = await helpers.Redis.get('freebird', req.params.freebird);

	if (freebird) {
		var birdypet = helpers.BirdyPets.fetch(req.params.freebird);

		helpers.Redis.create('memberpet', {
			birdypetId: birdypet.id,
			birdypetSpecies: birdypet.species.speciesCode,
			member: req.session.user.id,
			hatchedAt: Date.now()
		}).then( (id) => {
			helpers.Redis.delete('freebird', req.params.freebird);

			res.json({
				response: `<a href="/birdypet/${id}">${birdypet.species.commonName}</a>`
			});
		});
	}
	else {
		res.json({
			error: "Someone already claimed this bird!"
		});
	}
});

module.exports = router;
