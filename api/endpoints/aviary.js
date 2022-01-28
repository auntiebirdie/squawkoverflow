const Database = require('../helpers/database.js');
const BirdyPet = require('../models/birdypet.js');
const Search = require('../helpers/search.js');

module.exports = async (req, res) => {
  Search.query('birdypet', req.query).then((response) => {
    var promises = [];

    response.results = response.results.map((result) => {
      result = new BirdyPet(result.id);

      promises.push(result.fetch({
        include: req.query.memberData ? ['memberData'] : [],
        member: req.query.memberData
      }));

      return result;
    });

    Promise.all(promises).then(() => {
      res.json(response);
    });
  });
};
