const Birds = require('../collections/birds.js');
const BirdyPets = require('../collections/birdypets.js');

var birdsPerPage = 24;

module.exports = async (req, res) => {
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

  for (var i = page, len = Math.min(page + birdsPerPage, birds.length); i < len; i++) {
    let birdypets = BirdyPets('speciesCode', birds[i].speciesCode).filter((birdypet) => !birdypet.special);

    if (req.query.loggedInUser) {
      birdypets.forEach((birdypet) => promises.push(birdypet.fetchMemberData(req.query.loggedInUser)));
    }

    output.push(birdypets);
  }

  await Promise.all(promises).then(() => {
    res.json({
      totalPages: Math.ceil(totalPages / birdsPerPage),
      results: output
    });
  });
};
