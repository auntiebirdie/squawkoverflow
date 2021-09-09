const helpers = require('./helpers');
const express = require('express');
const app = express();

app.set('view engine', 'ejs');
app.use(express.static('public'))

app.get('/', async (req, res) => {
  var recentlyAdded = await helpers.DB.fetch({
    "kind": "Photo",
    "order": ["submittedAt", {
      "descending": true
    }],
    "limit": 5
  });

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
    res.render('photos/index', {
      recentlyAdded: recentlyAdded,
      flocks: flocks
    });
  });
});

app.get('/flocks/:flock', (req, res) => {
  const query = DB.createQuery('Photo').filter('flocks', '=', req.params.flock).order('submittedAt', {
    descending: true
  });

  DB.runQuery(query).then((results) => {
    res.render('flocks/index', {
      photos: results[0]
    });
  });
});

app.use((err, req, res, next) => {
  res.status(500);
  res.send("Oops, something went wrong.")
});

app.listen(8080);
