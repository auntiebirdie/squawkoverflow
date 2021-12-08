const Search = require('../helpers/search.js');

module.exports = async (req, res) => {
  let query = req.query;

  query.sort = ['name', 'ASC'];
  query.member = req.query.loggedInUser;

  Search.get('Bird', query).then((results) => {
    res.json(results);
  });
  /*
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
      let birdypets = BirdyPets.fetch('speciesCode', birds[i].speciesCode).filter((birdypet) => !birdypet.special);

      if (req.query.loggedInUser) {
        birdypets.forEach((birdypet) => promises.push(birdypet.fetchMemberData(req.query.loggedInUser)));
      }

      if (birdypets.length > 0) {
        output.push(birdypets);
      }
    }

    await Promise.all(promises).then(() => {
      for (let bird of output) {
        bird.sort((a, b) => (a.hatched === b.hatched) ? 0 : a.hatched ? -1 : 1);
      }

      res.json({
        totalPages: Math.ceil(totalPages / birdsPerPage),
        results: output
      });
    });
    */
};
