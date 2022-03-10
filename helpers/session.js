const secrets = require('../secrets.json');
const session = require('express-session');

const DB = secrets.REDIS[process.env.NODE_ENV ? 'PROD' : 'DEV'];

const RedisStore = require('connect-redis')(session);
const RedisClient = require('redis').createClient({
  host: DB.HOST,
  port: DB.PORT,
  password: DB.PASS
});

module.exports = session({
  store: new RedisStore({
    client: RedisClient
  }),
  secret: 'birds are just government drones',
  resave: false,
  saveUninitialized: false,
  cookie: {
    domain: 'squawkoverflow.com',
    maxAge: 30 * 24 * 60 * 60 * 1000 // 30 days
  }
});