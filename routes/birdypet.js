const BirdyPets = require('../helpers/birdypets.js');
const Cache = require('../helpers/cache.js');
const MemberPets = require('../helpers/memberpets.js');
const Members = require('../helpers/members.js');
const Middleware = require('../helpers/middleware.js');
const Queue = require('../helpers/queue.js');
const Redis = require('../helpers/redis.js');

const express = require('express');
const router = express.Router();

router.get('/buddy/:memberpet', Middleware.isLoggedIn, Middleware.entityExists, Middleware.userOwnsEntity, (req, res) => {
  Members.set(req.session.user, { birdyBuddy: req.entities['memberpet']._id }).then( () => {
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

router.get('/release/:memberpet', Middleware.isLoggedIn, Middleware.entityExists, Middleware.userOwnsEntity, (req, res) => {
  res.render('birdypet/release', {
    userpet: req.entities['memberpet'],
    birdypet: BirdyPets.fetch(req.entities['memberpet'].birdypetId)
  });
});

router.post('/release/:memberpet', Middleware.isLoggedIn, Middleware.entityExists, Middleware.userOwnsEntity, (req, res, next) => {
  Redis.delete('memberpet', req.entities['memberpet']._id).then(async () => {
    await Members.removeBirdyPet(req.session.user, req.entities['memberpet'].birdypetId);

    await Queue.add('free-birds', {
	    'member' : req.session.user,
	    'birdypet' : req.entities['memberpet'].birdypetId
    });

    res.redirect('/aviary/' + req.session.user);
  });
});

router.get('/:memberpet', Middleware.entityExists, async (req, res) => {
  var memberpet = MemberPets.format(req.entities['memberpet']);

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
    otherVersions: BirdyPets.findBy("speciesCode", memberpet.speciesCode).filter((birdypet) => !birdypet.special),
    wishlisted: req.session.user ? await Cache.get('wishlist', req.session.user).then((wishlist) => wishlist[memberpet.species.family] ? wishlist[memberpet.species.family].includes(memberpet.species.speciesCode) : false) : false
  });
});

router.post('/:memberpet', Middleware.isLoggedIn, Middleware.entityExists, Middleware.userOwnsEntity, (req, res) => {
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

  Redis.set('memberpet', req.entities['memberpet']._id, {
    nickname: nickname,
    birdypetId: variant,
    description: description,
    flocks: flocks.map((flock) => flock).join(',')
  }).then(() => {
    res.redirect('/birdypet/' + req.entities['memberpet']._id);
  });
});

module.exports = router;
