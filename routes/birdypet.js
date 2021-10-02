const helpers = require('../helpers');
const express = require('express');
const router = express.Router();

router.get('/buddy/:id', helpers.Middleware.isLoggedIn, helpers.Middleware.entityExists, helpers.Middleware.userOwnsEntity, (req, res) => {
  helpers.Redis.set('member', req.session.user.id, {
    birdyBuddy: req.entity._id
  }).then(() => {
    res.redirect(`/birdypet/${req.entity._id}`);
  });
});

router.get('/gift/:id', helpers.Middleware.isLoggedIn, helpers.Middleware.entityExists, helpers.Middleware.userOwnsEntity, (req, res) => {
  helpers.DB.fetch({
    "kind": "Member"
  }).then((members) => {
    res.render('birdypet/gift', {
      giftpet: {
        userpet: req.entity,
        birdypet: helpers.BirdyPets.fetch(req.entity.birdypetId)
      },
      members: members
    });
  });
});

router.post('/gift/:id', helpers.Middleware.isLoggedIn, helpers.Middleware.entityExists, helpers.Middleware.userOwnsEntity, (req, res, next) => {
  helpers.Redis.get('member', req.body.member).then((member) => {
    if (!member) {
      throw "that isn't a registered member!";
    }

    helpers.Redis.set('memberpet', req.params.id, {
      "member": member._id,
      "flocks": "",
      "friendship": 0
    }).then(() => {
      var birdypet = helpers.BirdyPets.fetch(req.entity.birdypetId);

      helpers.Discord.Webhook.send('exchange', {
        from: req.session.user,
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
    birdypet: helpers.BirdyPets.fetch(req.entity.birdypetId)
  });
});

router.post('/release/:id', helpers.Middleware.isLoggedIn, helpers.Middleware.entityExists, helpers.Middleware.userOwnsEntity, (req, res, next) => {
  var birdypet = helpers.BirdyPets.fetch(req.entity.birdypetId);

  helpers.Discord.Webhook.send('free-birds', {
    birdypet: birdypet
  }).then(() => {

    helpers.Redis.delete('memberpet', req.params.id).then(() => {

      res.redirect('/aviary/' + req.session.user.id);
    });
  }).catch((err) => {
    next(err);
  });
});

router.get('/:id', helpers.Middleware.entityExists, async (req, res) => {
  var birdypet = helpers.BirdyPets.fetch(req.entity.birdypetId);

  var member = await helpers.Redis.get('member', req.entity.member);

  if (!member) {
    member = {
      _id: req.entity.member,
      username: "Unregistered"
    }
  }

  if (req.session.user && req.session.user.id == member._id) {
    var allFlocks = await helpers.Redis.fetch({
      "kind": "flock",
      "filters": [
	      { field : "member", value : member._id }
      ]
    });
  }

  if (req.entity.flocks) {
	  req.entity.flocks = req.entity.flocks.split(',');
    var flocks = [];

    for (var flock of req.entity.flocks) {
	    let flockData = await helpers.Redis.get('flock', flock);

	    if (flockData) {
		    flocks.push(flockData);
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

router.post('/:id', helpers.Middleware.isLoggedIn, helpers.Middleware.entityExists, helpers.Middleware.userOwnsEntity, (req, res) => {
  var nickname = req.body.nickname;
  var variant = req.body.variant || req.entity.birdypetId;
  var description = req.body.description;
  var flocks = req.body.flocks || [];

  if (nickname.length > 50) {
    nickname = nickname.slice(0, 50);
  }

  if (description.length > 500) {
    description = description.slice(0, 500);
  }

  helpers.Redis.set('memberpet', req.params.id, {
    nickname: nickname,
    birdypetId: variant,
    description: description,
    flocks: flocks.map( (flock) => flock ).join(',')
  }).then(() => {
    res.redirect('/birdypet/' + req.params.id);
  });
});

module.exports = router;
