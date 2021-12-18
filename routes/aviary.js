const API = require('../helpers/api.js');

const express = require('express');
const router = express.Router();

router.get('/:member', async (req, res, next) => {
  let member = await API.call('member', 'GET', {
      id: req.params.member,
      include: ['flocks', 'families']
    });

  res.render('aviary/index', {
    page: 'aviary',
    member: member,
    families: member.families.filter( (family) => family.owned > 0).map( (family) => family.value ),
    flocks: member.flocks,
    currentPage: (req.query.page || 1) * 1
  });
});

module.exports = router;
