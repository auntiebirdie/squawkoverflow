const secrets = require('./secrets.json');
const helpers = require('./helpers');
const {
  Datastore
} = require('@google-cloud/datastore');
const {
  DatastoreStore
} = require('@google-cloud/connect-datastore');
const DiscordOauth2 = require("discord-oauth2");
const oauth = new DiscordOauth2();
const Chance = require('chance').Chance();
const express = require('express');
const session = require('express-session');
const axios = require('axios');
const app = express();

app.set('view engine', 'ejs');
app.use(express.static('public'));
app.use(express.urlencoded({
  extended: true
}));
app.use(session({
  store: new DatastoreStore({
    kind: 'Session',
    expirationMs: 0,
    dataset: new Datastore({
      namespace: 'squawkoverflow',
      projectId: process.env.GCLOUD_PROJECT,
      keyFilename: process.env.GOOGLE_APPLICATION_CREDENTIALS
    })
  }),
  secret: 'birds are just government drones',
  resave: true,
  saveUninitialized: false
}));

app.use(function(req, res, next) {
  if (req.session.user) {
    res.locals.loggedInUser = req.session.user;
  }

  res.locals.siteMenu = [{
      "label": "Groups",
      "href": "/groups",
    },
    {
      "label": "BirdyPets",
      "href": "/birdypets"
    },
    {
      "label": "Members",
      "href": "/members"
    },
    {
      "label": "Discord",
      "href": "https://discord.gg/h87wansdg2"
    }
  ].map((item) => {
    item.active = req.url.startsWith(item.href);

    return item;
  });

  next();
});

app.get('/', async (req, res) => {
  var recentlyAdded = await helpers.DB.fetch({
    "kind": "Photo",
    "order": ["submittedAt", {
      "descending": true
    }],
    "limit": 20
  });

  res.render('home/index', {
    recentlyAdded: recentlyAdded
  });
});

app.get('/groups', async (req, res) => {
  var flocks = await helpers.DB.fetch({
    "kind": "Flock",
    "order": ["name"]
  });

  flocks = flocks.map(async (flock) => {
    flock.image = await helpers.DB.fetch({
      "kind": "Photo",
      "filters": [
        ["flocks", "=", flock.name]
      ],
      "order": ["submittedAt", {
        "descending": true
      }],
      "limit": 1
    });

    return flock;
  });

  Promise.all(flocks).then((flocks) => {
    res.render('flocks/list', {
      flocks: flocks
    });
  });
});

app.get('/groups/:flock', async (req, res) => {
  var flock = await helpers.DB.fetch({
    "kind": "Flock",
    "filters": [
      ["name", "=", req.params.flock]
    ]
  });

  var photos = await helpers.DB.fetch({
    "kind": "Photo",
    "filters": [
      ["flocks", "=", req.params.flock]
    ],
    "order": ["submittedAt", {
      "descending": true
    }]
  });

  res.render('flocks/index', {
    flock: flock[0],
    photos: photos
  });
});

app.get('/photos/:id', async (req, res) => {
  var photo = await helpers.DB.get(['Photo', req.params.id * 1]);

  if (typeof photo.submittedBy == "string") {
    photo.submittedBy = await helpers.DB.get(['Member', photo.submittedBy]).then((member) => {
      if (member) {
        member.id = member[Datastore.KEY].name;

        return member;
      } else {
        return photo.submittedBy;
      }
    });
  }

  res.render('photos/index', {
    photo: photo
  });
});

app.get('/members', (req, res) => {
  helpers.DB.fetch({
    "kind": "Member"
  }).then((members) => {
    res.render('members/index', {
      members: members.map((member) => {
        return {
          id: member[Datastore.KEY].name,
          username: member.username,
          avatar: member.avatar
        }
      })
    });
  });
});

app.get('/members/:id', async (req, res) => {
  var member = await helpers.DB.get(['Member', req.params.id]).then((member) => {
    member.id = member[Datastore.KEY].name;

    return member;
  });

  if (member) {
    member.userpets = await helpers.DB.fetch({
      "kind": "MemberPet",
      "filters": [
        ["member", "=", member.id]
      ],
      "order": ["hatchedAt", {
        "descending": true
      }],
      "limit": 6
    }).then((userpets) => {
      return userpets.map((userpet) => {
        return {
          id: userpet[Datastore.KEY].id,
          nickname: userpet.nickname,
          hatchedAt: userpet.hatchedAt,
          birdypet: helpers.BirdyPets.fetch(userpet.birdypet)
        }
      });
    });

    member.badges = await helpers.DB.fetch({
      "kind": "MemberBadge",
      "filters": [
        ["member", "=", req.params.id]
      ]
    });

    res.render('members/view', {
      member: member
    });
  } else {
    console.error(`ERROR - member ${req.params.id} not found`);
    res.redirect('/404');
  }
});

app.get('/unidentified', async (req, res) => {
  var photos = await helpers.DB.fetch({
    "kind": "Photo",
    "filters": [
      ["species", "=", "unidentified"]
    ]
  });

  res.render('photos/unidentified', {
    photos: photos
  });
});

app.get('/birdypets', async (req, res) => {
  res.render('birdypets/index');
});

app.get('/birdypets/mine', async (req, res) => {
  if (req.session.user) {
    var userpets = await helpers.DB.fetch({
      "kind": "MemberPet",
      "filters": [
        ["member", "=", req.session.user.id]
      ],
      "order": ["hatchedAt", {
        "descending": true
      }]
    }).then((userpets) => {
      return userpets.map((userpet) => {
        return {
          id: userpet[Datastore.KEY].id,
          nickname: userpet.nickname,
          hatchedAt: userpet.hatchedAt,
          birdypet: helpers.BirdyPets.fetch(userpet.birdypet)
        }
      });
    });

    res.render('birdypets/mine', {
      userpets: userpets
    });
  } else {
    res.redirect('/');
  }
});

app.get('/birdypets/gift/:id', async (req, res) => {
  try {
    var gift = await helpers.DB.get(['MemberPet', req.params.id * 1]).then(async (userpet) => {
      if (userpet.member != req.session.user.id) {
        throw "this isn't yours!";
      }

      res.render('birdypets/gift', {
        giftpet: {
          id: userpet[Datastore.KEY].id,
          nickname: userpet.nickname,
          birdypet: helpers.BirdyPets.fetch(userpet.birdypet)
        },
        members: await helpers.DB.fetch({
          "kind": "Member"
        }).then((members) => {
          return members.map((member) => {
            return {
              id: member[Datastore.KEY].name,
              username: member.username,
              avatar: member.avatar
            };
          });
        })
      });
    });
  } catch (err) {
    res.redirect('/error');
  }
});

app.post('/birdypets/gift/:id', (req, res) => {
  try {
    helpers.DB.get(['MemberPet', req.params.id * 1]).then(async (userpet) => {
      if (userpet.member != req.session.user.id) {
        throw "this isn't yours!";
      }

      if (!req.body.member) {
        throw "you gotta gift it to someone!";
      }

      helpers.DB.get(['Member', req.body.member]).then((member) => {
        if (!member) {
          throw "that isn't a registered member!";
        }

        userpet.member = member[Datastore.KEY].name;

        helpers.DB.save(userpet).then(() => {
          res.redirect('/birdypets/' + req.params.id);
        });
      });
    });
  } catch (err) {
    res.redirect('/error');
  }
});

app.get('/birdypets/trade/:id', async (req, res) => {
  try {
    var tradeFor = await helpers.DB.get(['MemberPet', req.params.id * 1]).then(async (userpet) => {
      return {
        id: userpet[Datastore.KEY].id,
        nickname: userpet.nickname,
        birdypet: helpers.BirdyPets.fetch(userpet.birdypet),
        member: await helpers.DB.get(['Member', userpet.member]).then((member) => {
          if (member) {
            return {
              id: member[Datastore.KEY].name,
              username: member.username,
              avatar: member.avatar
            }
          } else {
            return {
              id: userpet.member,
              username: `Unregistered User ${userpet.member}`,
              avatar: null
            }
          }
        })
      }
    });

    var userpets = await helpers.DB.fetch({
      "kind": "MemberPet",
      "filters": [
        ["member", "=", req.session.user.id]
      ]
    }).then((userpets) => {
      return userpets.map((userpet) => {
        return {
          id: userpet[Datastore.KEY].id,
          nickname: userpet.nickname,
          hatchedAt: userpet.hatchedAt,
          birdypet: helpers.BirdyPets.fetch(userpet.birdypet)
        }
      });
    });

    res.render('birdypets/trade', {
      tradeFor: tradeFor,
      userpets: userpets
    });
  } catch (err) {
    res.redirect('/error');
  }
});

app.get('/birdypets/:id', async (req, res) => {
  var userpet = await helpers.DB.get(['MemberPet', req.params.id * 1], false).then(async (userpet) => {
    if (userpet) {
      userpet.id = userpet[Datastore.KEY].id;

      if (typeof userpet.birdypet == "string") {
        userpet.birdypet = helpers.BirdyPets.fetch(userpet.birdypet);
      }

      if (!userpet.member.id) {
        userpet.member = await helpers.DB.get(['Member', userpet.member]).then((member) => {
          if (member) {
            member.id = member[Datastore.KEY].name;

            return member;
          } else {
            return userpet.member;
          }
        });
      }

      res.render('birdypets/view', {
        userpet: userpet
      });
    } else {
      res.redirect('/error');
    }
  });
});

app.post('/birdypets/:id', async (req, res) => {
  var userpet = await helpers.DB.get(['MemberPet', req.params.id * 1], false).then(async (userpet) => {
    if (userpet) {
      var nickname = req.body.nickname;

      if (nickname.length > 32) {
        nickname = nickname.slice(0, 32);
      }

      userpet.nickname = nickname.replace(/[&<>'"]/g,
        tag => ({
          '&': '&amp;',
          '<': '&lt;',
          '>': '&gt;',
          "'": '&#39;',
          '"': '&quot;'
        } [tag]));

      await helpers.DB.save(userpet);

      res.redirect('/birdypets/' + req.params.id);
    } else {
      res.json({
        error: "BirdyPet not found."
      });
    }
  });
});

app.get('/api/birdypets/:family', async (req, res) => {
  var birds = await helpers.DB.fetch({
    "kind": "Illustration",
    "filters": [
      ["species.family", "=", req.params.family]
    ]
  });

  if (req.session.user) {
    var userpets = await helpers.DB.fetch({
      "kind": "MemberPet",
      "filters": [
        ["member", "=", req.session.user.id]
      ]
    }).then((birdypets) => {
      return birdypets.map((bird) => bird.birdypet);
    });
  } else {
    var userpets = [];
  }

  var output = {};

  for (var bird of birds) {
    let commonName = bird.species.commonName;

    if (!output[commonName]) {
      output[commonName] = [];
    }

    output[commonName].push({
      id: bird[Datastore.KEY].name,
      species: bird.species,
      illustration: bird.illustration,
      version: bird.version,
      label: bird.label,
      hatched: userpets.includes(bird[Datastore.KEY].name)
    });
  }

  res.json(output);
});

app.get('/login', (req, res) => {
  oauth.tokenRequest({
    clientId: secrets.DISCORD.CLIENT_ID,
    clientSecret: secrets.DISCORD.CLIENT_SECRET,
    redirectUri: "https://squawkoverflow.com/login",
    code: req.query.code,
    scope: 'identify',
    grantType: 'authorization_code'
  }).then((response) => {
    if (response.access_token) {
      oauth.getUser(response.access_token).then((user) => {
        req.session.user = {
          id: user.id,
          username: user.username,
          avatar: user.avatar
        };
        helpers.DB.get(['Member', user.id]).then((member) => {
          if (!member) {
            var member = {};
            member.joinedAt = Date.now();
          } else {
            var member = member;
          }

          member.lastLogin = Date.now();
          member.username = user.username;
          member.avatar = user.avatar;

          helpers.DB.upsert(['Member', user.id], member).then(() => {
            res.redirect('/');
          });
        });
      });
    } else {
      res.redirect('/error');
    }
  }).catch((err) => {
    console.log(err);
    res.redirect('/error');
  });
});

app.get('/logout', (req, res) => {
  req.session.destroy((err) => {
    res.redirect('/');
  });
});

app.use('*', (req, res) => {
  res.status(404);
  res.render('error/404', {
    error: true
  });
});

app.use((err, req, res, next) => {
  console.log(err);
  res.status(500);
  res.render('error/404', {
    error: true
  });
});

app.listen(8080);
