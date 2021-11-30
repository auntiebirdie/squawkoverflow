exports.api = (req, res) => {
  if (req.query?.sort && req.query.sort == "[null]") {
    delete req.query.sort;
  }

  console.info(req.method, req.path, JSON.stringify(req.method == "GET" || req.method == "HEAD" ? req.query : req.body));

  try {
    let route = req.path.match(/\/?(\b[A-Za-z]+\b)/);

    require(`./endpoints/${route[0]}.js`)(req, res);
  } catch (err) {
    console.error(err);
    res.sendStatus(404);
  }
}
