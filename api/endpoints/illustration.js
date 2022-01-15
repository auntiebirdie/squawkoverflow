const Variant = require('../models/variant.js');

module.exports = async (req, res) => {
  var variant = new Variant(req.query.id);

  await variant.fetch();

  res.json(variant);
}
