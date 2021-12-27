const Birds = require('../collections/birds.js');
const Bird = require('../models/bird.js');

module.exports = async (req, res) => {
  var birdsPerPage = 24;
  var page = (--req.query.page || 0) * birdsPerPage;
  var output = [];

  if (req.query.family) {
    var birds = Birds.fetch("family", req.query.family);
  } else {
    var birds = Birds.all().filter((bird) => req.query.adjectives ? bird.adjectives.includes(req.query.adjectives) : true);
  }

  if (req.query.search) {
    birds = birds.filter((bird) => bird.commonName.toLowerCase().includes(req.query.search.toLowerCase()));
  }

  var totalPages = birds.length;
  var promises = [];

  birds.sort((a, b) => a.commonName.localeCompare(b.commonName));

  for (let i = page, len = Math.min(page + birdsPerPage, birds.length); i < len; i++) {
    let bird = new Bird(birds[i].speciesCode);

    promises.push(bird.fetch({
      include: ['illustrations', 'memberData'],
      member: req.query.loggedInUser
    }));

    output.push(bird);
  }

  await Promise.all(promises).then(() => {
    output = output.filter((bird) => bird.illustrations.length > 0);

    res.json({
      totalPages: Math.ceil(totalPages / birdsPerPage),
      results: output
    });
  });
};
