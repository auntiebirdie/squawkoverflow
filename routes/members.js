const API = require('../helpers/api.js');
const Middleware = require('../helpers/middleware.js');

const express = require('express');
const router = express.Router();

router.get('/', (req, res) => {
  res.render('members/index', {
    title: 'Members',
    currentPage: (req.query.page || 1) * 1,
    sidebar: 'filters',
    sortFields: ['username-ASC', 'username-DESC', 'aviary-DESC', 'aviary-ASC', 'joinedAt-DESC', 'joinedAt-ASC', 'activeAt-DESC']
  });
});

router.get('/:member', (req, res) => {
  API.call('member', "GET", {
    id: req.params.member,
    include: ['badges', 'birdyBuddy', 'families', 'featuredFlock', 'flocks', 'hasWishlist', 'rank', 'totals']
  }).then(async (member) => {
    if (member.id != req.session.user && member.settings?.privacy_profile) {
      return res.render('members/private', {
        member: member
      });
    }

    API.call('families', 'GET').then((allFamilies) => {
      res.render('members/member', {
        title: `${member.username} | Members`,
        page: 'member',
        member: member,
        allFamilies: allFamilies,
        sidebar: 'member'
      });
    });
  });
});

router.get('/:member/gift', Middleware.isLoggedIn, (req, res) => {
  API.call('member', 'GET', {
    id: req.params.member
  }).then((member) => {
    if (member.settings.privacy_gifts) {
      return res.render('error/gifting', {
        member: member
      });
    }

    API.call('member', 'GET', {
      id: req.session.user,
      include: ['flocks', 'families']
    }).then(async (loggedInUser) => {
      res.render('aviary/index', {
        page: 'gift',
        member: member,
        flocks: loggedInUser.flocks,
        allFamilies: await API.call('families', 'GET'),
        families: loggedInUser.families.filter((family) => family.owned > 0).map((family) => family.name),
        currentPage: (req.query.page || 1) * 1,
        sidebar: 'filters',
        searchFields: [{
          id: 'cleanName',
          name: 'Common Name'
        }, {
          id: 'scientificName',
          name: 'Scientific Name'
        }, {
          id: 'nickname',
          name: 'Nickname'
        }],
        sortFields: ['hatchedAt-DESC', 'hatchedAt-ASC', 'commonName-ASC', 'commonName-DESC', 'scientificName-ASC', 'scientificName-DESC'],
        filters: ['wanted-Their', 'needed-Their'],
        extraFilters: ['unhatched-Their', 'duplicated-My']
      });
    });
  });
});

router.get('/:member/flocks', async (req, res) => {
  let member = await API.call('member', 'GET', {
    id: req.params.member
  });

  let flocks = await API.call('flocks', 'GET', {
    id: req.params.member
  });

  res.render('members/flocks', {
    title: `${member.username}'s Flocks`,
    flocks: req.session.user == req.params.member ? flocks : flocks.filter((flock) => !flock.private)
  });
});

module.exports = router;