const API = require('../helpers/api.js');

const fs = require('fs');
const express = require('express');
const router = express.Router();

router.get('/', async (req, res) => {
  API.call('hatch', "GET", {
      loggedInUser: req.session.user
    }, res).then((response) => {
      API.call('member', 'GET', {
        id: req.session.user,
        include: ['hasIncubator']
      }).then((member) => {
        return res.render('hatch/index', {
		title: 'Hatch an Egg',
          eggs: response,
          hasIncubator: member.hasIncubator
        });
      });
    })
    .catch((err) => {
      switch (err.code) {
        case 401:
        case "401":
          return res.redirect('/login');
          break;
        case 403:
        case "403":
          if (err.response.data.timeUntil > 0) {
            return res.render('hatch/timer.ejs', {
		    title: 'Hatch an Egg',
              timeUntil: err.response.data.timeUntil
            });
          } else if (err.response.data.aviaryFull) {
            return res.render('hatch/full.ejs', {
		    title: 'Hatch an Egg'
	    });
          } else {
            return res.redirect('/error');
          }
          break;
        default:
          return res.redirect('/error');
      }
    });
});

router.get('/incubator', (req, res) => {
  API.call('incubate', 'GET', {
    loggedInUser: req.session.user
  }).then((eggs) => {
    return res.render('hatch/incubator', {
	    title: 'Incubator',
      eggs: eggs
    });
  });
});

module.exports = router;
