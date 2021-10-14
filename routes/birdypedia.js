const helpers = require('../helpers');
const express = require('express');
const router = express.Router();

router.get('/', async (req, res) => {
  var families = require('../public/data/families.json');
  var adjectives = require('../public/data/adjectives.json');

  res.render('birdypedia', {
    families: families.sort((a, b) => a.label.localeCompare(b.label)),
    adjectives: adjectives
  });
});

router.get('/bird/:code', async (req, res) => {
  var bird = helpers.Birds.findBy("speciesCode", req.params.code);

  if (bird) {
    var memberpets = await helpers.MemberPets.fetch({
	    'FILTER' : `@birdypetSpecies:{${bird.speciesCode}}`,
	    'RETURN' : ['member', 'birdypetId']
    });

    var hatched = req.session.user ? memberpets.filter((memberpet) => memberpet.member == req.session.user.id).map((memberpet) => memberpet.birdypetId) : [];

    var birdypets = helpers.BirdyPets.findBy('species.speciesCode', bird.speciesCode)
      .sort(function(a, b) {
        var aIndex = hatched.indexOf(a.id);
        var bIndex = hatched.indexOf(b.id);

        return (aIndex > -1 ? aIndex : Infinity) - (bIndex > -1 ? bIndex : Infinity);
      });

    var members = new Set();

    for (var memberpet of memberpets) {
      members.add(memberpet.member);
    }

    members = await Promise.all([...members].map((id) => {
      return helpers.Redis.get('member', `${id}`);
    }));

    res.render('birdypedia/bird', {
      page: 'birdypedia/bird',
      bird: bird,
      birdypets: birdypets,
      members: members,
      hatched: hatched
    });
  } else {
    res.redirect('/birdypedia');
  }
});

module.exports = router;
