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
    sortFields: ['hatchedAt-DESC', 'hatchedAt-ASC', 'commonName-ASC', 'commonName-DESC', 'scientificName-ASC', 'scientificName-DESC', 'friendship-DESC', 'friendship-ASC'],
    extraInsights: member.id == req.session.user ? ['unhatched-My', 'isolated-My', 'duplicated-My', 'someone'] : ['unhatched-My', 'duplicated-Their',  'wanted-My', 'needed-My']
  });
});

module.exports = router;
