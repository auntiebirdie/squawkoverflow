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
      "label": "Home",
      "href": "/",
      "active": req.url == "/"
    },
    {
      "label": "Flocks",
      "href": "/flocks",
      "active": req.url.startsWith("/flocks")
    }
  ];

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

  var flocks = await helpers.DB.fetch({
    "kind": "Flock",
    "order": ["name"],
    "limit": 4
  });

  flocks = flocks.map(async (flock) => {
    flock.image = await helpers.DB.fetch({
      "kind": "Photo",
      "filters": [
        ["flocks", "=", flock.slug]
      ],
      "order": ["submittedAt", {
        "descending": true
      }],
      "limit": 1
    });

    return flock;
  });

  Promise.all(flocks).then((flocks) => {
    res.render('home/index', {
      recentlyAdded: recentlyAdded,
      flocks: flocks,

    });
  });
});

app.get('/flocks', async (req, res) => {
  var flocks = await helpers.DB.fetch({
    "kind": "Flock",
    "order": ["name"]
  });

  flocks = flocks.map(async (flock) => {
    flock.image = await helpers.DB.fetch({
      "kind": "Photo",
      "filters": [
        ["flocks", "=", flock.slug]
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

app.get('/flocks/:flock', async (req, res) => {
  var flock = await helpers.DB.fetch({
    "kind": "Flock",
    "filters": [
      ["slug", "=", req.params.flock]
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

  res.render('photos/index', {
    photo: photo
  });
});

app.get('/members/:id', async (req, res) => {
  var member = await helpers.DB.get(['Member', req.params.id]);

  if (member) {
    res.render('members/index', {
      member: member
    });
  } else {
    console.error(`ERROR - member ${req.params.id} not found`);
    res.redirect('/404');
  }
});

app.get('/unidentified', async (req, res) => {
	var photos = await helpers.DB.fetch({
		"kind" : "Photo",
		"filters" : [
			["species", "=", "unidentified"]
		]
	});

	res.render('photos/unidentified', {
		photos: photos
	});
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
        helpers.DB.upsert(['Member', user.id], {
          username: user.username,
          avatar: user.avatar
        }).then(() => {
          res.redirect('/');
        });
      });
    } else {
      res.redirect('/error');
    }
  }).catch((err) => {
    console.log(err);
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
  res.status(500);
  res.render('error/404', {
    error: true
  });
});

app.listen(8080);
