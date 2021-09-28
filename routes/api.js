const helpers = require('../helpers');
const express = require('express');
const router = express.Router();

router.get('/birdypets/:family', async (req, res) => {
  var birds = await helpers.DB.fetch({
    "kind": "Illustration",
    "filters": [
      ["species.family", "=", req.params.family]
    ]
  });

  if (req.session.user) {
    var userpets = await helpers.DB.fetch({
      "kind": "MemberPet",
      "filters": [
        ["member", "=", req.session.user.id]
      ]
    }).then((birdypets) => {
      return birdypets.map((bird) => bird.birdypet);
    });
  } else {
    var userpets = [];
  }

  var output = {};

  for (var bird of birds) {
    let commonName = bird.species.commonName;

    if (!output[commonName]) {
      output[commonName] = [];
    }

    output[commonName].push({
      id: bird[helpers.DB.KEY].name,
      species: bird.species,
      illustration: bird.illustration,
      version: bird.version,
      label: bird.label,
      hatched: userpets.includes(bird[helpers.DB.KEY].name)
    });
  }

  res.json(output);
});

router.get('/flocks/:MemberFlock/:MemberPet', helpers.Middleware.isLoggedIn, helpers.Middleware.entityExists, helpers.Middleware.userOwnsEntity, (req, res) => {
  var index = req.entities['MemberPet'].flocks ? req.entities['MemberPet'].flocks.indexOf(req.entities['MemberFlock']._id) : -1;
  var flocks = req.entities['MemberPet'].flocks ? req.entities['MemberPet'].flocks : [];

	if (index !== -1) {
			flocks.splice(index, -1);
	}
	else {
		flocks.push(req.entities['MemberFlock']._id);
	}

  helpers.DB.set('MemberPet', req.entities['MemberPet']._id, {
    flocks: flocks
  }).then(() => {

    res.json({
      action: index !== -1 ? "remove" : "add"
    });
  });
});

module.exports = router;
