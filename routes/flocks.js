const API = require('../helpers/api.js');
const Middleware = require('../helpers/middleware.js');

const express = require('express');
const router = express.Router();

router.get('/', Middleware.isLoggedIn, async (req, res) => {
  let flocks = await API.call('flocks', 'GET', {
    id: req.session.user
  });

  res.render('flocks/index', {
    flocks: flocks
  });
});

router.get('/new', Middleware.isLoggedIn, async (req, res) => {
  res.render('flocks/new');
});

router.get('/:flock/manage', Middleware.isLoggedIn, async (req, res) => {
  var flock = await API.call('flock', 'GET', {
    id: req.params.flock
  });

  if (flock.member != req.session.user) {
    return res.redirect('/flocks');
  }

  var member = await API.call('member', 'GET', {
    id: req.session.user,
    include: ['families', 'flocks']
  });

  res.render('flocks/manage', {
    page: "manageFlock",
    member: member,
    flock: flock,
    flocks: member.flocks,
    allFamilies: await API.call('families', 'GET'),
    families: member.families.map((family) => family.name),
    sidebar: 'filters',
    sortFields: ['hatchedAt-ASC', 'hatchedAt-DESC', 'commonName-ASC', 'commonName-DESC', 'scientificName-ASC', 'scientificName-DESC', 'friendship-DESC', 'friendship-ASC'],
    extraFilters: ['isolated-My', 'duplicated-My']
  });
});

router.get('/:flock', async (req, res) => {
  let flock = await API.call('flock', 'GET', {
    id: req.params.flock,
    include: ['families']
  });

  let member = await API.call('member', 'GET', {
    id: flock.member
  });

  console.log(flock.families);

  res.render('flocks/flock', {
    page: 'flock',
    member: member,
    flock: flock,
    allFamilies: await API.call('families', 'GET'),
    families: flock.families,
    sidebar: 'filters',
    sortFields: ['hatchedAt-ASC', 'hatchedAt-DESC', 'commonName-ASC', 'commonName-DESC', 'scientificName-ASC', 'scientificName-DESC', 'friendship-DESC', 'friendship-ASC'],
    filters: member.id == req.session.user ? false : ['wanted-My', 'needed-My'],
    extraFilters: member.id == req.session.user ? ['isolated-My', 'duplicated-My'] : ['unhatched-My']
  });
});

module.exports = router;
