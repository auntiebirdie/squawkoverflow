const Search = require('../helpers/search.js');

module.exports = (req, res) => {
  Search.get('MemberPet', req.query).then((results) => {
    res.json(results);
  });
};
