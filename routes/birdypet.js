const Middleware = require('../helpers/middleware.js');

const API = require('../helpers/api.js');

const express = require('express');
const router = express.Router();

router.get('/:memberpet/gift', Middleware.isLoggedIn, async (req, res) => {
  let memberpet = await API.call('memberpet', 'GET', {
    id: req.params.memberpet
  });

  let members = await API.call('members', 'GET', {
    privacy: 'gifts'
  });

  if (memberpet.member == req.session.user) {
    res.render('birdypet/gift', {
      memberpet: memberpet,
      members: members,
      selectedMember: req.query.member ? req.query.member : null
    });
  } else {
    res.redirect(`/birdypet/${req.params.memberpet}`);
  }
});

router.get('/release/:memberpet', (req, res) => {
  API.call('memberpet', 'GET', {
    id: req.params.memberpet
  }).then((memberpet) => {
    res.render('birdypet/release', {
      memberpet: memberpet
    });
  });
});

router.get('/:memberpet', async (req, res) => {
  let memberpet = await API.call('memberpet', 'GET', {
    id: req.params.memberpet,
    member: req.session.user,
    fetch: req.session.user ? ['memberData', 'variants'] : []
  });

  let member = await API.call('member', 'GET', {
    id: memberpet.member,
    flocks: true
  });

  res.render('birdypet/birdypet', {
    memberpet: memberpet,
    member: member
  });
});

module.exports = router;
