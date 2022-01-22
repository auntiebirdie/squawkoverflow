const API = require('../helpers/api.js');
const Middleware = require('../helpers/middleware.js');

const express = require('express');
const router = express.Router();

router.get('/', async (req, res) => {
  let members = await API.call('members');

  res.render('members/index', {
    members: members
  });
});

router.get('/:member', async (req, res) => {
  API.call('member', "GET", {
    id: req.params.member,
    include: ['aviary', 'birdyBuddy', 'families', 'featuredFlock', 'flocks', 'hasWishlist']
  }).then(async (member) => {
    if (member.id != req.session.user && member.settings?.privacy?.includes('profile')) {
      return res.redirect('/error');
    }

    API.call('families', 'GET').then((allFamilies) => {
      res.render('members/member', {
        page: 'member',
        member: member,
        allFamilies: allFamilies,
        sidebar: 'member'
      });
    });
  });
});

router.get('/:member/gift', Middleware.isLoggedIn, async (req, res) => {
  API.call('member', 'GET', {
    id: req.params.member
  }).then(async (member) => {
    if (member.settings.privacy?.includes('gifts')) {
      return res.redirect('/error');
    }

    API.call('member', 'GET', {
      id: req.session.user,
      include: ['flocks', 'families']
    }).then(async (loggedInUser) => {
      res.render('members/gift', {
        page: 'gift',
        member: member,
        flocks: loggedInUser.flocks,
        allFamilies: await API.call('families', 'GET'),
        families: loggedInUser.families.filter((family) => family.owned > 0).map((family) => family.name),
        currentPage: (req.query.page || 1) * 1,
        sidebar: 'filters',
        sortFields: [{
            value: 'hatchedAt-DESC',
            label: 'Hatch Date (Newest)'
          }, {
            value: 'hatchedAt-ASC',
            label: 'Hatch Date (Oldest)'
          }, {
            value: 'commonName-ASC',
            label: 'Common Name (A-Z)'
          },
          {
            value: 'commonName-DESC',
            label: 'Common Name (Z-A)'
          },
          {
            value: 'scientificName-ASC',
            label: 'Scientific Name (A-Z)'
          },
          {
            value: 'scientificName-DESC',
            label: 'Scientific Name (Z-A)'
          }
        ],
        extraInsights: [{
          id: 'wishlisted',
          label: 'Wishlisted',
        }, {
          id: 'duplicated',
          label: 'Duplicates'
        }]
      });
    });
  });
});

module.exports = router;