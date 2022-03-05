exports.api = (req, res) => {
  const bunyan = require('bunyan');
  const {
    LoggingBunyan
  } = require('@google-cloud/logging-bunyan');
  const loggingBunyan = new LoggingBunyan();

  req.logger = bunyan.createLogger({
    name: process.env.NODE_ENV == 'PROD' ? 'squawkoverflow' : 'squawkdev',
    streams: [{
      stream: process.stdout,
      level: 'info'
    }, loggingBunyan.stream('info')]
  });

  try {
    if (req.path == '/ping') {
      return res.sendStatus(200);
    }

    let route = req.path.match(/\/?(\b[A-Za-z\_]+\b)/)[0];

    var data = (req.method == "GET" || req.method == "HEAD") ? req.query : req.body;

    for (let key in data) {
      data[key] = JSON.parse(data[key]);
    }

    req.logger.info({
      req: {
        method: req.method,
        url: req.path,
        headers: req.headers,
        data: data
      }
    }, `${req.method} ${req.path} ${JSON.stringify(Object.fromEntries(Object.entries(data).filter((a) => ["id", "member", "loggedInUser"].includes(a[0]) )))}`);

    require(`./endpoints/${route}.js`)(req, res);
  } catch (err) {
    console.error(err);
    res.sendStatus(404);
  }
}

exports.background = (message, context) => {
  const PubSub = require('./helpers/pubsub.js');

  return PubSub.receive(message, context);
}
