exports.api = (req, res) => {
  req.logger = require('./helpers/logger.js');

  try {
    if (req.path == '/ping') {
      return res.sendStatus(200);
    }

    let route = req.path.match(/\/?(\b[A-Za-z\_]+\b)/)[0];

    var data = (req.method == "GET" || req.method == "HEAD") ? req.query : req.body;

    for (let key in data) {
      data[key] = JSON.parse(data[key]);
    }

    if (req.method == "POST" && data.loggedInUser) {
      const Database = require('./helpers/database.js');

      Database.query('UPDATE members SET lastActivityAt = NOW() WHERE id = ?', [data.loggedInUser]);
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
