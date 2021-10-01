const helpers = require('../helpers');
const express = require('express');
const router = express.Router();

router.get('/', async (req, res) => {
  if (req.session.user) {
    var skipAdjectives = [
      'circular',
      'dead',
      'east', 'eastern',
      'featherless', 'fleshy', 'forked',
      'human', 'hybrid',
      'last',
      'north', 'northern', 'northeastern', 'northwestern',
      'rummaging',
      'south', 'southern', 'southeastern', 'southwestern',
      'west', 'western', 'wooded'
    ];
    var adjectives = helpers.Chance.pickset(
      helpers.data('eggs').filter((adjective) => !skipAdjectives.includes(adjective)),
      5
    );

    req.session.adjectives = adjectives;

    res.render('hatch/eggs', {
      adjectives: adjectives
    });
  } else {
    res.redirect('/account/login');
  }
});

router.post('/', async (req, res) => {
  if (req.session.user) {
    if (req.body.egg) {
      var adjective = req.body.egg;

      if (req.session.adjectives && req.session.adjectives.includes(adjective)) {
        var birdypet = helpers.Chance.pickone(helpers.BirdyPets.findBy('adjectives', adjective));
        req.session.birdypet = birdypet;
        req.session.adjective = adjective;
        delete req.session.adjectives;

        if (birdypet) {
          return res.render('hatch/hatched', {
            adjective: adjective,
            birdypet: birdypet
          });
        } else {
          return res.redirect('/error');
        }
      }
    } else if (req.body.action) {
      var action = req.body.action;
      var birdypet = req.session.birdypet;
      delete req.session.birdypet;

      switch (action) {
        case "keep":
          return helpers.DB.create('MemberPet', {
            birdypet: birdypet.id,
            member: req.session.user.id,
            hatchedAt: Date.now()
          }).then((id) => {
            helpers.Discord.Webhook.send('egg-hatchery', {
              adjective: req.session.adjective,
              member: req.session.user.id,
              userpet: id,
              birdypet: birdypet
            });
            delete req.session.adjective;
            return res.redirect(`/birdypet/${id}`);
          });
          break;
        case "release":
          // TODO - only post to webhook if a verified server member
          helpers.Discord.Webhook.send('free-birds', {
            member: req.session.user.id,
            birdypet: birdypet
          });
          return res.redirect('/hatch');
          break;
      }
    }

    delete req.session.adjectives;
    delete req.session.adjective;
    delete req.session.birdypet;

    res.redirect('/error');
  } else {
    res.redirect('/account/login');
  }
});

module.exports = router;