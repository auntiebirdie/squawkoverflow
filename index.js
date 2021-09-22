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

const {
  MessageEmbed,
  WebhookClient
} = require('discord.js');

const webhookClient = new WebhookClient({
  id: secrets.DISCORD.WEBHOOK_ID,
  token: secrets.DISCORD.WEBHOOK_TOKEN
});

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

  res.locals.KEY = helpers.DB.KEY;

  res.locals.siteMenu = require('./data/menu.json').map((item) => {
    item.active = req.url.startsWith(item.href);

    return item;
  });

  next();
});

app.use('/', require('./routes/home.js'));
app.use('/groups', require('./routes/groups.js'));
app.use('/photos', require('./routes/photos.js'));
app.use('/members', require('./routes/members.js'));
app.use('/birdypets', require('./routes/birdypets.js'));

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
  if (process.env.KONAMI && process.env.KONAMI == req.query.code) {
    helpers.DB.get('Member', `${process.env.USER_ID}`).then((member) => {
      req.session.user = {
        id: process.env.USER_ID,
        username: member.username,
        avatar: member.avatar
      };

      res.redirect('/');
    });
  } else {
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

          helpers.DB.get('Member', user.id).then((member) => {
            var data = {
              lastLogin: Date.now(),
              username: user.username,
              avatar: user.avatar
            };

            if (!member) {
              data.joinedAt = Date.now();
            }

            helpers.DB.set('Member', user.id, data).then(() => {
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
  }
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

app.listen(process.env.PORT || 8080);
