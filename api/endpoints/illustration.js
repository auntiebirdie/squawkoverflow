const Illustration = require('../models/illustration');

module.exports = async (req, res) => {
  var illustration = new Illustration(req.query.id);

  await illustration.fetch();

  res.json(illustration);
}