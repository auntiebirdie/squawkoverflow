const Bird = require('../models/bird.js');
const Birds = require('../collections/birds.js');
const Counters = require('../helpers/counters.js');
const Members = require('../collections/members.js');

module.exports = async (req, res) => {
  if (req.query.taxonomy) {
    var birds = await Birds.fetch('*', req.query.taxnomy);

    if (birds.length > 0) {
      birds.shuffle();

      var bird = new Bird(birds[0]);
    } else {
      return res.json(null);
    }
  } else {
    var bird = await Birds.random().then((bird) => new Bird(bird.code));
  }

  await bird.fetch();

  res.json(bird);
}