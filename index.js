const {
  Datastore
} = require('@google-cloud/datastore');
const {
  DatastoreStore
} = require('@google-cloud/connect-datastore');

const secrets = require('./secrets.json');
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
app.use(express.urlencoded({
  extended: true
}));

app.use(function(req, res, next) {
  var menu = [];

  if (req.session.user) {
    res.locals.loggedInUser = req.session.user;

    menu.push({
      "label": "Hatch Eggs",
      "href": "/hatch"
    }, {
      "label": "My Aviary",
      "href": `/aviary/${req.session.user.id}`
    });
  }

  menu.push({
    "label": "Birdypedia",
    "href": "/birdypedia"
  }, {
    "label": "Members",
    "href": "/members"
  }, {
    "label": "Discord",
    "href": "https://discord.com/invite/h87wansdg2",
    "newWindow": true
  }, {
    "label": "FAQ",
    "href": "/faq"
  });

  res.locals.siteMenu = menu.map((item) => {
    item.active = req.url.startsWith(item.href);

    return item;
  });

  next();
});

app.use('/', require('./routes/home.js'));
app.use('/hatch', require('./routes/hatch.js'));
app.use('/birdypet', require('./routes/birdypet.js'));
app.use('/aviary', require('./routes/aviary.js'));
app.use('/flocks', require('./routes/flocks.js'));
app.use('/birdypedia', require('./routes/birdypedia.js'));
app.use('/members', require('./routes/members.js'));
app.use('/faq', require('./routes/faq.js'));
app.use('/account', require('./routes/account.js'));
app.use('/api', require('./routes/api.js'));

app.use('*', (req, res) => {
  res.status(404);
  res.render('error/404', {
    error: true
  });
});

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500);
  res.render('error/404', {
    error: true
  });
});

app.listen(process.env.PORT || 8080);
