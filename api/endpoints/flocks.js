const Flocks = require('../collections/flocks.js');

module.exports = async (req, res) => {
  switch (req.method) {
    case "GET":
      var flocks = await Flocks.all(req.query.id);

      res.json(flocks);
      break;
  }
};
