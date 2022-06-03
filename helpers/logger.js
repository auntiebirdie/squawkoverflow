const bunyan = require('bunyan');
const {
  LoggingBunyan
} = require('@google-cloud/logging-bunyan');
const loggingBunyan = new LoggingBunyan();
const secrets = require('../secrets.json');

module.exports = bunyan.createLogger({
  name: secrets.ENV == 'PROD' ? 'squawkoverflow' : 'squawkdev',
  streams: [{
    stream: process.stdout,
    level: 'info'
  }, loggingBunyan.stream('info')]
});
