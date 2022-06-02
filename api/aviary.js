const Database = require('../helpers/database.js');
const BirdyPet = require('../models/birdypet.js');
const Search = require('../helpers/search.js');

module.exports = async (req, res) => {
  Search.query('birdypet', req.query).then((response) => {
    var promises = [];

    response.results = response.results.map((result) => {
      result = new BirdyPet(result.id);

      let includes = [];

      if (req.query.memberData) {
        includes.push('memberData');
      }

      if (req.query.exchangeData) {
        includes.push('exchangeData');
      }

      promises.push(result.fetch({
        include: includes,
        member: req.query.memberData,
        exchange: req.query.exchangeData
      }));

      return result;
    });

    Promise.all(promises).then(() => {
      res.json(response);
    });
  });
};