const API = require('../helpers/api.js');

const helpers = require('../helpers');
const express = require('express');
const router = express.Router();

router.get('/:adjective', async (req, res) => {
  var adjectives = req.session.adjectives;
  delete req.session.adjectives;

  var adjective = req.params.adjective;

  res.set('Cache-Control', 'no-store');

  if (adjectives && adjectives.includes(adjective)) {
    API.call('hatch', 'POST', {
      loggedInUser: req.session.user,
      egg: adjective
    }).then((response) => {
      return res.render('hatch/hatched', {
        adjective: adjective,
        birdypet: response
      });
    }).catch((code, err) => {
      console.log(err);
    });
  } else {
    return res.redirect('/hatch');
  }
});

module.exports = router;