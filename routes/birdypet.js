const Members = require('../helpers/members.js');

const helpers = require('../helpers');
const express = require('express');
const router = express.Router();

router.get('/buddy/:memberpet', helpers.Middleware.isLoggedIn, helpers.Middleware.entityExists, helpers.Middleware.userOwnsEntity, (req, res) => {
  helpers.Redis.set('member', req.session.user.id, {
    birdyBuddy: req.entities['memberpet']._id
  }).then(() => {
    res.redirect(`/birdypet/${req.entities['memberpet']._id}`);
  });
});

router.get('/gift/:memberpet', helpers.Middleware.isLoggedIn, helpers.Middleware.entityExists, helpers.Middleware.userOwnsEntity, (req, res) => {
  helpers.Redis.scan('member', {
    'SORTBY' : ['username']
  }).then((members) => {
    res.render('birdypet/gift', {
      giftpet: {
        userpet: req.entities['memberpet'],
        birdypet: helpers.BirdyPets.fetch(req.entities['memberpet'].birdypetId)
      },
      members: members.filter((member) => {
          member = Members.format(member);

          return member.lastLogin && !member.settings.privacy?.includes('gifts');
      }),
      selectedMember: req.query.member ? req.query.member : null
    });
  });
});

router.get('/release/:memberpet', helpers.Middleware.isLoggedIn, helpers.Middleware.entityExists, helpers.Middleware.userOwnsEntity, (req, res) => {
  res.render('birdypet/release', {
    userpet: req.entities['memberpet'],
    birdypet: helpers.BirdyPets.fetch(req.entities['memberpet'].birdypetId)
  });
});

router.post('/release/:memberpet', helpers.Middleware.isLoggedIn, helpers.Middleware.entityExists, helpers.Middleware.userOwnsEntity, (req, res, next) => {
  helpers.Redis.delete('memberpet', req.entities['memberpet']._id).then(() => {
    res.redirect('/aviary/' + req.session.user.id);
  });
});

router.get('/:memberpet', helpers.Middleware.entityExists, async (req, res) => {
  var memberpet = helpers.MemberPets.format(req.entities['memberpet']);

  var member = await helpers.Redis.get('member', memberpet.member);

  if (!member) {
    member = {
      _id: memberpet.member,
      username: "Unregistered"
    }
  }

  if (req.session.user && req.session.user.id == member._id) {
    var allFlocks = await helpers.Redis.fetch('flock', {
	    'FILTER': `@member:{${member._id}`,
	    'SORTBY': ['displayOrder', 'ASC']
    });
  }

  if (memberpet.flocks) {
    var flocks = [];

    for (var flock of memberpet.flocks) {
      let flockData = await helpers.Redis.get('flock', flock).catch((err) => {});

      if (flockData) {
        flocks.push(flockData);
      }
    }
  }

  res.render('birdypet/birdypet', {
    memberpet: memberpet,
    member: member,
    flocks: flocks || [],
    allFlocks: allFlocks || [],
    otherVersions: helpers.BirdyPets.findBy("speciesCode", memberpet.speciesCode).filter( (birdypet) => !birdypet.special )
  });
});

router.post('/:memberpet', helpers.Middleware.isLoggedIn, helpers.Middleware.entityExists, helpers.Middleware.userOwnsEntity, (req, res) => {
  var nickname = req.body.nickname;
  var variant = req.body.variant || req.entities['memberpet'].birdypetId;
  var description = req.body.description;
  var flocks = req.body.flocks || ["NONE"];

  if (nickname.length > 50) {
    nickname = nickname.slice(0, 50);
  }

  if (description.length > 500) {
    description = description.slice(0, 500);
  }

  helpers.Redis.set('memberpet', req.entities['memberpet']._id, {
    nickname: nickname,
    birdypetId: variant,
    description: description,
    flocks: flocks.map((flock) => flock).join(',')
  }).then(() => {
    res.redirect('/birdypet/' + req.entities['memberpet']._id);
  });
});

module.exports = router;
