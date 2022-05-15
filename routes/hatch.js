const API = require('../helpers/api.js');

const fs = require('fs');
const express = require('express');
const router = express.Router();

router.get('/', async (req, res) => {
  API.call('member', 'GET', {
    id: req.session.user,
    include: ['hasIncubator', 'flocks']
  }).then((member) => {
    API.call('hatch', "GET", {
        loggedInUser: req.session.user
      }, res).then((response) => {
        return res.render('hatch/index', {
          title: 'Hatch an Egg',
          eggs: response,
          member: member
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
                timeUntil: err.response.data.timeUntil,
                member: member
              });
            } else if (err.response.data.aviaryFull) {
              return res.render('hatch/full.ejs', {
                title: 'Hatch an Egg',
                member: member
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
});

router.get('/incubator', (req, res) => {
  API.call('member', 'GET', {
    id: req.session.user,
    include: ['hasIncubator', 'flocks']
  }).then(async (member) => {
    return res.render('hatch/incubator', {
      title: 'Incubator',
      page: 'incubator',
      member: member,
      allFamilies: await API.call('families', 'GET'),
      families: await API.call('incubate', 'HEAD', { loggedInUser : req.session.user }),
      currentPage: (req.query.page || 1) * 1,
      sidebar: 'filters',
      sortFields: ['commonName-ASC', 'commonName-DESC', 'scientificName-ASC', 'scientificName-DESC', 'addedAt-ASC', 'addedAt-DESC'],
    });
  });
});

module.exports = router;
