const bunyan = require('bunyan');
const {
  LoggingBunyan
} = require('@google-cloud/logging-bunyan');
const loggingBunyan = new LoggingBunyan();

module.exports = bunyan.createLogger({
  name: process.env.NODE_ENV == 'PROD' ? 'squawkoverflow' : 'squawkdev',
  streams: [{
    stream: process.stdout,
    level: 'info'
  }, loggingBunyan.stream('info')]
});