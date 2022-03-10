const {
  Datastore
} = require('@google-cloud/datastore');
const {
  DatastoreStore
} = require('@google-cloud/connect-datastore');
const session = require('express-session');

module.exports = session({
  store: new DatastoreStore({
    kind: 'express-sessions',
    expirationMs: 30 * 24 * 60 * 60 * 1000, // 30 days,
    dataset: new Datastore()
  }),
  secret: 'birds are just government drones',
  resave: false,
  saveUninitialized: false,
  cookie: {
    domain: '.squawkoverflow.com',
    maxAge: 30 * 24 * 60 * 60 * 1000 // 30 days
  }
});
