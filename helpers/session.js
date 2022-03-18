const {
  Datastore
} = require('@google-cloud/datastore');
const {
  DatastoreStore
} = require('@google-cloud/connect-datastore');
const session = require('express-session');
const secrets = require('../secrets.json');

module.exports = session({
  store: new DatastoreStore({
    kind: 'express-sessions',
    expirationMs: 30 * 24 * 60 * 60 * 1000, // 30 days,
    dataset: new Datastore()
  }),
  secret: secrets.SESSION_TOKEN,
  key: 'squawk.connect.sid',
  resave: false,
  saveUninitialized: false,
  cookie: {
    domain: '.squawkoverflow.com',
    maxAge: 30 * 24 * 60 * 60 * 1000 // 30 days
  }
});
