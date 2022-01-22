const secrets = require('./secrets.json');
const chance = require('chance').Chance();
const express = require('express');
const session = require('express-session');
const {
  createClient
} = require('redis');
const app = express();

const API = require('./helpers/api.js');

app.get('/_ah/warmup', (req, res) => {
  API.call('ping').then(() => {
    res.send("🌄🐓");
  });
});

const DB = secrets.REDIS[process.env.NODE_ENV ? 'PROD' : 'DEV'];

const RedisStore = require('connect-redis')(session);
const RedisClient = createClient({
  host: DB.HOST,
  port: DB.PORT,
  password: DB.PASS
});

app.set('view engine', 'ejs');
app.use(express.static('public'));
app.use(express.json());
app.use(session({
  store: new RedisStore({
    client: RedisClient
  }),
  secret: 'birds are just government drones',
  resave: false,
  saveUninitialized: false,
  cookie: {
    maxAge: 30 * 24 * 60 * 60 * 1000 // 30 days
  }
}));

app.use(async function(req, res, next) {
  if (req.path.startsWith('/api') || req.path.startsWith('/logout')) {
    return next();
  }

  var menu = [];

  if (req.session.user) {
    req.session.loggedInUser = await API.call('member', 'GET', {
      id: req.session.user
    }).catch((err) => {
      console.log(err);
      delete req.session.user;
      delete req.session.loggedInUser;
    });

    res.locals.ENV = process.env.NODE_ENV ? 'PROD' : 'DEV';
    res.locals.loggedInUser = req.session.loggedInUser;

    menu.push({
      "icon": "🥚",
      "label": "Hatch Eggs",
      "href": "/hatch"
    }, {
      "icon": "🐣",
      "label": "Free Birds",
      "href": `/freebirds`
    });

    if (chance.bool({
        likelihood: 5
      }) && chance.bool({
        likelihood: 5
      })) {

      res.locals.bugFound = await API.call('bug', 'PUT', {
        members: [req.session.user],
        bugs: 1
      });
    }
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

app.use('/', require('./routes/home.js'));
app.use('/hatch', require('./routes/hatch.js'));
app.use('/birdypet', require('./routes/birdypet.js'));
app.use('/aviary', require('./routes/aviary.js'));
app.use('/wishlist', require('./routes/wishlist.js'));
app.use('/flocks', require('./routes/flocks.js'));
app.use('/freebirds', require('./routes/freebirds.js'));
app.use('/birdypedia', require('./routes/birdypedia.js'));
app.use('/members', require('./routes/members.js'));
app.use('/settings', require('./routes/settings.js'));
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