const Database = require('../helpers/database.js');
const Bird = require('../models/bird.js');

module.exports = async (req, res) => {
  var birdsPerPage = 24;
  var page = (--req.query.page || 0) * birdsPerPage;
  var output = [];

  let query = 'SELECT species.code';
  let filters = [];
  let params = [];

  if (req.query.search) {
    query += ', MATCH(species.commonName, species.scientificName) AGAINST (? IN BOOLEAN MODE)';
    filters.push('MATCH(species.commonName, species.scientificName) AGAINST (? IN BOOLEAN MODE)');

    Array(2).fill(`${req.query.search}*`).forEach((param) => params.push(param));
  }
  query += ' FROM species';

  if (req.query.family) {
    filters.push('species.family = ?');
    params.push(req.query.family);
  } else if (req.query.adjectives) {
    query += ' JOIN species_adjectives ON (species.code = species_adjectives.species)';
    filters.push('species_adjectives.adjective = ?');
    params.push(req.query.adjectives);
  }

  if (req.query.artist) {
    filters.push('species.code IN (SELECT a.species FROM variants a WHERE a.credit = ?)');
    params.push(req.query.artist);
  }

  // TODO: validate user has access to extra insights
  if (req.query.loggedInUser && Array.isArray(req.query.extraInsights)) {
    for (let insight of req.query.extraInsights) {
      switch (insight) {
        case 'hatched':
          filters.push('(SELECT `count` FROM counters WHERE `member` = ? AND type = "species" AND id = species.code) > 0');
          params.push(req.query.loggedInUser);
          break;
        case 'unhatched':
          filters.push('(SELECT IF(`count` = 0, NULL, 1) FROM counters WHERE `member` = ? AND type = "species" AND id = species.code) IS NULL');
          params.push(req.query.loggedInUser);
          break;
        case 'wishlisted':
          filters.push('species.code IN (SELECT a.species FROM wishlist a WHERE a.member = ?)');
          params.push(req.query.loggedInUser);
          break;
        case 'somewhere':
          filters.push('(SELECT MAX(`count`) FROM counters WHERE type = "species" AND id = species.code) > 0');
          break;
      }
    }
  }

  if (filters.length > 0) {
    query += ' WHERE ' + filters.join(' AND ');
  }

  query += ' ORDER BY ';

  switch (req.query.sort) {
    case 'scientificName':
      query += 'species.scientificName';
      break;
    case 'commonName':
    default:
      query += 'species.commonName';
  }

  query += ' ' + (req.query.sortDir == 'DESC' ? 'DESC' : 'ASC');

  Database.query(query, params).then((birds) => {

    var totalPages = birds.length;
    var promises = [];

    for (let i = page, len = Math.min(page + birdsPerPage, birds.length); i < len; i++) {
      let bird = new Bird(birds[i].code);

      promises.push(bird.fetch({
        include: ['variants', 'memberData'],
        member: req.query.loggedInUser,
        artist: req.query.artist
      }));

      output.push(bird);
    }

    Promise.all(promises).then(() => {
      output = output.filter((bird) => bird.variants.length > 0);

      res.json({
        totalPages: Math.ceil(totalPages / birdsPerPage),
        results: output
      });
    });
  });
};