require('@google-cloud/trace-agent').start();

exports.api = (req, res) => {
  try {
    let route = req.path.match(/\/?(\b[A-Za-z]+\b)/);

    require(`./endpoints/${route[0]}.js`)(req, res);
  } catch (err) {
    console.error(err);
    res.sendStatus(404);
  }
}
