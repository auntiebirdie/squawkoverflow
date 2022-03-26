const Middleware = require('../helpers/middleware.js');

const API = require('../helpers/api.js');

const express = require('express');
const router = express.Router();

router.get('/:birdypet/gift', Middleware.isLoggedIn, async (req, res) => {
  let birdypet = await API.call('birdypet', 'GET', {
    id: req.params.birdypet,
    include: ['exchangeData']
  });

  let members = await API.call('members', 'GET', {
    privacy: 'gifts',
    include: ['birdData'],
    bird: birdypet.bird.id
  });

  if (birdypet.member == req.session.user) {
    res.render('birdypet/gift', {
      birdypet: birdypet,
      members: members.filter((member) => member.id != req.session.user).map((member) => {
        return {
          id: member.id,
          username: member.username,
          avatar: member.avatar,
          wishlisted: member.wishlisted,
          owned: member.owned
        };
      }),
      selectedMember: req.query.member ? members.find((member) => member.id == req.query.member) : null
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

  if (birdypet.member) {
    let member = await API.call('member', 'GET', {
      id: birdypet.member,
      include: ['flocks']
    });

    res.render('birdypet/birdypet', {
      title: birdypet.nickname ? birdypet.nickname : `${member.username}'s ${birdypet.bird.commonName}`,
      page: 'birdypet',
      birdypet: birdypet,
      member: member,
      sidebar: 'birdypet'
    });
  } else {
    res.render('error/404', { error : true });
  }
});

module.exports = router;
