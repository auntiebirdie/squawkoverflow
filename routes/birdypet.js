const BirdyPets = require('../helpers/birdypets.js');
const Cache = require('../helpers/cache.js');
const MemberPets = require('../helpers/memberpets.js');
const Members = require('../helpers/members.js');
const Middleware = require('../helpers/middleware.js');
const Queue = require('../helpers/queue.js');
const Redis = require('../helpers/redis.js');

const API = require('../helpers/api.js');

const express = require('express');
const router = express.Router();

router.get('/buddy/:memberpet', Middleware.isLoggedIn, Middleware.entityExists, Middleware.userOwnsEntity, (req, res) => {
  Members.set(req.session.user, {
    birdyBuddy: req.entities['memberpet']._id
  }).then(() => {
    res.redirect(`/birdypet/${req.entities['memberpet']._id}`);
  });
});

router.get('/gift/:memberpet', Middleware.isLoggedIn, Middleware.entityExists, Middleware.userOwnsEntity, async (req, res) => {
  var members = await Members.all();

  res.render('birdypet/gift', {
    giftpet: {
      userpet: req.entities['memberpet'],
      birdypet: BirdyPets.fetch(req.entities['memberpet'].birdypetId)
    },
    members: members.filter((member) => !member.settings.privacy?.includes('gifts')),
    selectedMember: req.query.member ? req.query.member : null
  });
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
  API.call('memberpet', 'GET', {
    id: req.params.memberpet
  }).then(async (memberpet) => {
    var member = await Redis.get('member', memberpet.member);

    if (!member) {
      member = {
        _id: memberpet.member,
        username: "Unregistered"
      }
    }

    if (req.session.user == member._id) {
      var allFlocks = await Redis.fetch('flock', {
        'FILTER': `@member:{${member._id}`,
        'SORTBY': ['displayOrder', 'ASC']
      });
    }

    if (memberpet.flocks) {
      var flocks = [];

      for (var flock of memberpet.flocks) {
        let flockData = await Redis.get('flock', flock).catch((err) => {});

        if (flockData) {
          flocks.push(flockData);
        }
      }
    }

    res.render('birdypet/birdypet', {
      memberpet: memberpet,
      member: member,
      flocks: flocks || [],
      allFlocks: allFlocks?.results || [],
      otherVersions: BirdyPets.findBy("speciesCode", memberpet.species.speciesCode).filter((birdypet) => !birdypet.special),
      wishlisted: req.session.user ? await Cache.get('wishlist', req.session.user).then((wishlist) => wishlist[memberpet.species.family] ? wishlist[memberpet.species.family].includes(memberpet.species.speciesCode) : false) : false
    });
  });
});

module.exports = router;
