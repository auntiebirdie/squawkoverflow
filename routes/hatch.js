const API = require('../helpers/api.js');

const fs = require('fs');
const express = require('express');
const router = express.Router();

router.get('/', async (req, res) => {
  res.set('Cache-Control', 'no-store');

  API.call('hatch', "GET", {
      loggedInUser: req.session.user
    }, res).then((response) => {
	    console.log(response);
      req.session.adjectives = response.map((egg) => egg.name);

      return res.render('hatch/index', {
        eggs: response.map((egg) => {
          egg.icon = fs.existsSync(`${__dirname}/../public/img/eggs/${egg.adjective}.png`) ? egg.adjective : 'default';

          return egg;
        })
      });
    })
    .catch((err) => {
	    console.log(err);
      switch (err.code) {
        case 401:
        case "401":
          return res.redirect('/login');
          break;
        case 403:
        case "403":
          if (err.response.data.timeUntil > 0) {
            return res.render('hatch/timer.ejs', {
              timeUntil: err.response.data.timeUntil
            });
          } else if (err.response.data.aviaryFull) {
            return res.render('hatch/full.ejs');
          } else {
            return res.redirect('/error');
          }
          break;
        default:
          return res.redirect('/error');
      }
    });
});

module.exports = router;
