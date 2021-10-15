const helpers = require('../helpers');
const express = require('express');
const router = express.Router();

router.get('/', helpers.Middleware.isLoggedIn, async (req, res) => {
  var member = await helpers.Redis.get('member', req.session.user.id);
  var timeUntil = 0;

  if (member.tier) {
    if (member.lastHatchedAt) {
      var tier = helpers.MemberTiers(member);

      if (tier.eggTimer) {
        var timeSinceLastHatch = (Date.now() - member.lastHatchedAt) / 60000;

        if (timeSinceLastHatch < tier.eggTimer) {
          timeUntil = Math.floor(tier.eggTimer - timeSinceLastHatch);
        }
      }
    }
  }

  if (timeUntil == 0) {
    var adjectives = helpers.Chance.pickset(
      helpers.data('eggs'),
      5
    );

    req.session.adjectives = adjectives;
  } else {
    var adjectives = [];
  }

  res.render('hatch/eggs', {
    adjectives: adjectives,
    timeUntil: timeUntil
  });
});

router.post('/', helpers.Middleware.isLoggedIn, async (req, res) => {
  if (req.body.egg) {
    var adjective = req.body.egg;

    if (req.session.adjectives && req.session.adjectives.includes(adjective)) {
      var bird = helpers.Birds.random('adjectives', adjective);
      var birdypet = helpers.Chance.pickone(helpers.BirdyPets.findBy('species.speciesCode', bird.speciesCode));
      delete req.session.adjectives;

      if (birdypet) {
        req.session.birdypet = birdypet;
        req.session.adjective = adjective;

        var userpets = [];

        await helpers.Redis.fetch('memberpet', {
          "FILTER": `@member:{${req.session.user.id}} @birdypetSpecies:{${birdypet.species.speciesCode}}`,
          "RETURN": ['birdypetId', 'species']
        }).then((results) => {
          for (var i = 0, len = results.length; i < len; i++) {
            userpets.push(results[i].birdypetId);
            userpets.push(results[i].birdypetSpecies);
          }
        });

        return res.render('hatch/hatched', {
          adjective: adjective,
          birdypet: birdypet,
          userpets: userpets
        });
      } else {
        return res.redirect('/hatch');
      }
    }
  } else if (req.body.action) {
    var action = req.body.action;
    var birdypet = req.session.birdypet;

    switch (action) {
      case "keep":
		    if (!birdypet) {
			    console.log(req.session);
		    }
        var id = await helpers.Redis.create('memberpet', {
          birdypetId: birdypet.id,
          birdypetSpecies: birdypet.species.speciesCode,
          species: birdypet.species.commonName,
          family: birdypet.species.family,
          member: req.session.user.id,
          hatchedAt: Date.now()
        });

        await helpers.Redis.set('member', req.session.user.id, {
          lastHatchedAt: Date.now()
        });

        helpers.Discord.Webhook.send('egg-hatchery', {
          adjective: req.session.adjective,
          member: req.session.user.id,
          userpet: id,
          birdypet: birdypet
        });

        delete req.session.adjective;
        return res.redirect(`/birdypet/${id}`);
        break;
      case "release":
        helpers.Redis.save(
          'freebird',
          birdypet.id, {
            "member": req.session.user.id,
            "source": "WEB"
          }
        );
        return res.redirect('/hatch');
        break;
    }
  }

  delete req.session.adjectives;
  delete req.session.adjective;
  delete req.session.birdypet;

  res.redirect('/hatch');
});

module.exports = router;
