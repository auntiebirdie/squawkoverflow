const Bird = require('../models/bird.js');
const Search = require('../helpers/search');

module.exports = async (req, res) => {
  Search.query('bird', req.query).then((response) => {
    var promises = [];

    response.results = response.results.map((result) => {
      result = new Bird(result.code);

      promises.push(result.fetch({
        include: ['variants', 'memberData'],
        member: req.query.loggedInUser,
        artist: req.query.artist
      }));

      return result;
    });

    Promise.all(promises).then(() => {
      res.json(response);
    });
  });
};
