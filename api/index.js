exports.api = (req, res) => {
  if (req.query?.sort && req.query.sort == "[null]") {
    delete req.query.sort;
  }

  try {
    let route = req.path.match(/\/?(\b[A-Za-z\_]+\b)/)[0];

	  console.log(req.method);

    var data = (req.method == "GET" || req.method == "HEAD") ? req.query : req.body;
	  console.log(req.query, data);

    for (let key in data) {
	    data[key] = JSON.parse(data[key]);
    }

	  console.log(req.query, data);

		  console.log(req.method, route, data);

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
