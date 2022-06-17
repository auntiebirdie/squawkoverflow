const secrets = require('../secrets.json');
const session = require('express-session');
const MySQLStore = require('express-mysql-session')(session);

module.exports = session({
  store: new MySQLStore({
	  host: secrets.DB.HOST,
	  user: secrets.DB.USER,
	  password: secrets.DB.PASS,
	  database: 'sessions'
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
