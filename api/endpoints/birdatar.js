const Member = require('../models/member.js');
const layers = require('../data/birdatar.json');

module.exports = async (req, res) => {
  switch (req.method) {
    case "GET":
      let member = new Member(req.query.loggedInUser);

      await member.fetch();

      var selectedComponents = {};

      try {
        selectedComponents = JSON.parse(member.settings.birdatar);
      } catch (err) {
        var rand = require('random-seed').create(req.query.loggedInUser);

        for (let layer of layers) {
          selectedComponents[layer.id] = rand(layer.components - 1) + 1;
        }
      }

      return res.json({
        selectedComponents,
        layers
      });
      break;
  }
}
