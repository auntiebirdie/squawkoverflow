const helpers = require('../helpers');
const express = require('express');
const router = express.Router();

router.get('/buddy/:id', helpers.Middleware.isLoggedIn, helpers.Middleware.entityExists, helpers.Middleware.userOwnsEntity, (req, res) => {
  helpers.DB.set('Member', req.session.user.id, {
    'birdyBuddy': req.entity._id
  }).then(() => {
    res.redirect(`/birdypet/${req.entity._id}`);
  });
});

router.get('/gift/:id', helpers.Middleware.isLoggedIn, helpers.Middleware.entityExists, helpers.Middleware.userOwnsEntity, (req, res) => {
  helpers.DB.fetch({
    "kind": "Member",
    "cacheId": "members"
  }).then((members) => {
    res.render('birdypet/gift', {
      giftpet: {
        userpet: req.entity,
        birdypet: helpers.BirdyPets.fetch(req.entity.birdypet)
      },
      members: members
    });
  });
});

router.post('/gift/:id', helpers.Middleware.isLoggedIn, helpers.Middleware.entityExists, helpers.Middleware.userOwnsEntity, (req, res) => {
  helpers.DB.get('Member', req.body.member).then((member) => {
    if (!member) {
      throw "that isn't a registered member!";
    }

    helpers.DB.set('MemberPet', req.params.id, {
      "member": member._id,
      "flocks": [],
      "friendship": 0
    }).then(() => {
      var birdypet = helpers.BirdyPets.fetch(req.entity.birdypet);

      helpers.Discord.Webhook.send('exchange', {
        from: req.session.user.id,
        to: req.body.member,
        userpet: req.entity,
        birdypet: birdypet
      });

      res.redirect('/birdypet/' + req.params.id);
    });
  }).catch((err) => {
    next(err);
  });
});

router.get('/release/:id', helpers.Middleware.isLoggedIn, helpers.Middleware.entityExists, helpers.Middleware.userOwnsEntity, (req, res) => {
  res.render('birdypet/release', {
    userpet: req.entity,
    birdypet: helpers.BirdyPets.fetch(req.entity.birdypet)
  });
});

router.post('/release/:id', helpers.Middleware.isLoggedIn, helpers.Middleware.entityExists, helpers.Middleware.userOwnsEntity, (req, res, next) => {
  var birdypet = helpers.BirdyPets.fetch(req.entity.birdypet);

  helpers.Discord.Webhook.send('free-birds', {
    birdypet: birdypet
  }).then(() => {

    helpers.DB.delete('MemberPet', req.params.id).then(() => {

      res.redirect('/aviary/' + req.session.user.id);
    });
  }).catch((err) => {
    next(err);
  });
});

router.get('/:id', helpers.Middleware.entityExists, async (req, res) => {
  var birdypet = helpers.BirdyPets.fetch(req.entity.birdypet);

  var member = await helpers.DB.get('Member', req.entity.member);

  if (!member) {
    member = {
      _id: req.entity.member,
      username: "Unregistered"
    }
  }

  if (req.session.user && req.session.user.id == member._id) {
    var allFlocks = await helpers.DB.fetch({
      "kind": "MemberFlock",
      "filters": [
        ["member", "=", member._id]
      ],
      "order": ["displayOrder", {}]
    });
  }
  if (req.entity.flocks) {
    var flocks = [];

    for (var flock of req.entity.flocks) {
	    if (!isNaN(flock * 1)) {
	    let flockData = await helpers.DB.get('MemberFlock', flock * 1);

	    if (flockData) {
		    flocks.push(flockData);
	    }
	    }
    }
  }

  res.render('birdypet/birdypet', {
    userpet: req.entity,
    birdypet: birdypet,
    member: member,
    flocks: flocks || [],
    allFlocks: allFlocks || [],
    otherVersions: helpers.BirdyPets.findBy("species.speciesCode", birdypet.species.speciesCode)
  });
});

router.post('/:id', helpers.Middleware.isLoggedIn, helpers.Middleware.entityExists, (req, res) => {
  var nickname = req.body.nickname;
  var variant = req.body.variant || req.entity.birdypet;
  var description = req.body.description;
  var flocks = req.body.flocks || [];

  if (nickname.length > 50) {
    nickname = nickname.slice(0, 50);
  }

  if (description.length > 500) {
    description = description.slice(0, 500);
  }

  helpers.DB.set('MemberPet', req.params.id, {
    nickname: nickname,
    birdypet: variant,
    description: description,
    flocks: flocks.map( (flock) => flock * 1 )
  }).then(() => {
    res.redirect('/birdypet/' + req.params.id);
  });
});

module.exports = router;
