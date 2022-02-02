const Bird = require('../models/bird.js');
const Birds = require('../collections/birds.js');

module.exports = async (req, res) => {
  if (req.query.taxonomy) {
    var birds = await Birds.fetch('*', req.query.taxonomy);

    if (birds.length > 0) {
      birds.sort(() => Math.random() - .5);

      var bird = new Bird(birds[0].code);
    } else {
      return res.json(null);
    }
  } else {
    var bird = await Birds.random().then((bird) => new Bird(bird.code));
  }

  await bird.fetch();

  res.json(bird);
}
