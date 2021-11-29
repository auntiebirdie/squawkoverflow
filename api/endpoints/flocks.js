const Flocks = require('../collections/flocks.js');

module.exports = async (req, res) => {
  switch (req.method) {
    case "GET":
		  console.log('GET');
      var flocks = await Flocks.all(req.query.id);
		  console.log(flocks);

      res.json(flocks);
      break;
  }
};
