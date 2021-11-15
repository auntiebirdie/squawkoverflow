try {
	require('@google-cloud/profiler').start();
} catch (err) {}

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

const Members = require('./helpers/members.js');

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

app.use(async function(req, res, next) {
  var menu = [];

  if (req.session.user) {
	  if (req.session.user.id) {
		  req.session.user = req.session.user.id;
	  }

    res.locals.loggedInUser = await Members.get(req.session.user);

    menu.push({
      "icon": "🥚",
      "label": "Hatch Eggs",
      "href": "/hatch"
    }, {
      "icon": "🐣",
      "label": "Free Birds",
      "href": `/freebirds`
    });
  }

  menu.push({
    "icon": "📚",
    "label": "Birdypedia",
    "href": "/birdypedia"
  }, {
    "icon": "👥",
    "label": "Members",
    "href": "/members"
  }, {
    "icon": "💬",
    "label": "Discord",
    "href": "https://discord.com/invite/h87wansdg2",
    "newWindow": true
  }, {
    "icon": "❔",
    "label": "FAQ",
    "href": "/faq"
  });

  res.locals.siteMenu = menu.map((item) => {
    item.active = req.url.startsWith(item.href);

    return item;
  });

  next();
});

app.get('/_ah/warmup', (req, res) => {
	res.send("🌄🐓");
});

app.use('/', require('./routes/home.js'));
app.use('/hatch', require('./routes/hatch.js'));
app.use('/hatched', require('./routes/hatched.js'));
app.use('/birdypet', require('./routes/birdypet.js'));
app.use('/aviary', require('./routes/aviary.js'));
app.use('/wishlist', require('./routes/wishlist.js'));
app.use('/flocks', require('./routes/flocks.js'));
app.use('/freebirds', require('./routes/freebirds.js'));
app.use('/birdypedia', require('./routes/birdypedia.js'));
app.use('/members', require('./routes/members.js'));
app.use('/login', require('./routes/login.js'));
app.use('/account', require('./routes/account.js'));
app.use('/faq', require('./routes/faq.js'));
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
