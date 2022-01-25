const API = require('../helpers/api.js');

const express = require('express');
const router = express.Router();

router.get('/:member', async (req, res, next) => {
  let member = await API.call('member', 'GET', {
    id: req.params.member,
    include: ['flocks', 'families']
  });

  var families = await API.call('families', 'GET');

  res.render('aviary/index', {
    page: 'aviary',
    member: member,
    allFamilies: families,
    families: member.families.filter((family) => family.owned > 0).map((family) => family.name),
    flocks: member.flocks,
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
      },
      {
        value: 'friendship-DESC',
        label: 'Friendship (Highest)'
      },
      {
        value: 'friendship-ASC',
        label: 'Friendship (Lowest)'
      }
    ],
    extraInsights: member.id == req.session.user ? [{
      id: 'duplicated',
      label: 'Duplicates'
    }] : [{
      id: 'hatched',
      label: "In My Aviary",
    }, {
      id: 'unhatched',
      label: "Not In My Aviary"
    }, {
      id: 'wanted',
      label: "In my Wishlist (Want It)"
    }, {
      id: 'needed',
      label: "In my Wishlist (Need It)"
    }, {
      id: 'duplicated',
      label: "Duplicates"
    }]
  });
});

module.exports = router;