const API = require('./helpers/api.js');
const chance = require('chance').Chance();
const express = require('express');
const useragent = require('express-useragent');
const formData = require('express-form-data');
const os = require('os');
const app = express();
const secrets = require('./secrets.json');

if (secrets.ENV == 'PROD') {
//  require('newrelic');
}

app.set('view engine', 'ejs');
app.use(express.static('public'));
app.use(express.json());
app.use(useragent.express());
app.use(formData.parse({
  uploadDir: os.tmpdir(),
  autoClean: true
}));

app.use(require('./helpers/session.js'));

app.use(async function(req, res, next) {
  res.set('Cache-Control', 'no-store');

  if (req.path.startsWith('/_') || req.path.startsWith('/api') || req.path.startsWith('/logout')) {
    return next();
  }

  if (req.query.error) {
    res.locals.displayError = req.query.error;
  }

  res.locals.isMobile = req.useragent.isMobile;
  res.locals.HOST = secrets.HOST;

  if (req.session.user) {
    res.locals.loggedInUser = await API.call('member', 'GET', {
      id: req.session.user,
      include: ['exchangeData', 'notificationCount', 'warnings']
    }).catch((err) => {
      console.log(err);
      delete req.session.user;
    });

    if (res.locals.loggedInUser) {
      // computers are bad at random so this helps keep it from triggering too often
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
    }
  }

  next();
});

app.use('/', require('./routes/home.js'));
app.use('/hatch', require('./routes/hatch.js'));
app.use('/birdypet', require('./routes/birdypet.js'));
app.use('/aviary', require('./routes/aviary.js'));
app.use('/wishlist', require('./routes/wishlist.js'));
app.use('/flocks', require('./routes/flocks.js'));
app.use('/freebirds', require('./routes/freebirds.js'));
app.use('/games', require('./routes/games.js'));
app.use('/birdypedia', require('./routes/birdypedia.js'));
app.use('/notifications', require('./routes/notifications.js'));
app.use('/members', require('./routes/members.js'));
app.use('/exchange', require('./routes/exchange.js'));
app.use('/settings', require('./routes/settings.js'));
app.use('/faq', require('./routes/faq.js'));
app.use('/api', require('./routes/api.js'));

app.use('*', (req, res) => {
  res.status(404);
  res.render('error/404', {
    title: 'S Q U A W K ? !',
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
