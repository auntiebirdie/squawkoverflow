const Middleware = require('../helpers/middleware.js');

const API = require('../helpers/api.js');

const express = require('express');
const router = express.Router();

router.get('/:birdypet/gift', Middleware.isLoggedIn, async (req, res) => {
  let birdypet = await API.call('birdypet', 'GET', {
    id: req.params.birdypet
  });

  let members = await API.call('members', 'GET', {
    privacy: 'gifts'
  });

  if (birdypet.member == req.session.user) {
    res.render('birdypet/gift', {
      birdypet: birdypet,
      members: members,
      selectedMember: req.query.member ? req.query.member : null
    });
  } else {
    res.redirect(`/birdypet/${req.params.birdypet}`);
  }
});

router.get('/release/:birdypet', (req, res) => {
  API.call('birdypet', 'GET', {
    id: req.params.birdypet
  }).then((birdypet) => {
    res.render('birdypet/release', {
      birdypet: birdypet
    });
  });
});

router.get('/:birdypet', async (req, res) => {
  let birdypet = await API.call('birdypet', 'GET', {
    id: req.params.birdypet,
    member: req.session.user,
    include: req.session.user ? ['memberData', 'variants'] : ['variants']
  });

  let member = await API.call('member', 'GET', {
    id: birdypet.member,
    include: ['flocks']
  });

  res.render('birdypet/birdypet', {
    page: 'birdypet',
    birdypet: birdypet,
    member: member,
    sidebar: 'birdypet'
  });
});

module.exports = router;
