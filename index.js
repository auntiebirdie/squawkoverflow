const API = require('./helpers/api.js');
const chance = require('chance').Chance();
const express = require('express');
const app = express();

app.get('/_ah/warmup', (req, res) => {
  API.call('ping').then(() => {
    res.send("🌄🐓");
  });
});

app.set('view engine', 'ejs');
app.use(express.static('public'));
app.use(express.json());

app.use(require('./helpers/session.js'));

app.use(async function(req, res, next) {
  if (req.path.startsWith('/_') || req.path.startsWith('/api') || req.path.startsWith('/logout')) {
    return next();
  }

  var menu = [];

  if (req.session.user) {
    req.session.loggedInUser = await API.call('member', 'GET', {
      id: req.session.user,
      include: ['exchangeData']
    }).catch((err) => {
      console.error(err);
      delete req.session.user;
      delete req.session.loggedInUser;
    });

    if (req.session.loggedInUser) {
      res.locals.ENV = process.env.NODE_ENV ? 'PROD' : 'DEV';
      res.locals.loggedInUser = req.session.loggedInUser;

      menu.push({
        "icon": "🥚",
        "label": "Hatch Eggs",
        "href": "/hatch"
      }, {
        "icon": "🐣",
        "label": "Free Birds",
        "href": "/freebirds"
      }, {
        "icon": "🤝",
        "label": "Exchange",
        "href": "/exchange",
        "notif": Math.max(0, req.session.loggedInUser.exchangeData)
      });

      // computers are bad at rnadom so this helps keep it from triggering too often
      if (chance.bool({
          likelihood: 10
        }) && chance.bool({
          likelihood: 5
        })) {

        res.locals.bugFound = await API.call('bug', 'PUT', {
          members: [req.session.user],
          bugs: 1
        });
      }
    } else {
      delete req.session.user;
      delete req.session.loggedInUser;
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
app.use('/exchange', require('./routes/exchange.js'));
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
