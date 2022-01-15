const Database = require('../helpers/database.js');
const Bird = require('../models/bird.js');

module.exports = async (req, res) => {
  var birdsPerPage = 24;
  var page = (--req.query.page || 0) * birdsPerPage;
  var output = [];

  let query = 'SELECT species.code FROM species';
  let filters = [];
  let params = [];

  if (req.query.family) {
    filters.push('species.family = ?');
    params.push(req.query.family);
  } else if (req.query.adjectives) {
    query += ' JOIN species_adjectives ON (species.code = species_adjectives.species)';
    filters.push('species_adjectives.adjective = ?');
    params.push(req.query.adjectives);
  }

  if (req.query.search) {
    filters.push('(species.commonName LIKE ? OR species.scientificName LIKE ?)');
    params.push(`%${req.query.search}%`);
    params.push(`%${req.query.search}%`);
  }

  // TODO: validate user has access to extra insights
  if (req.query.loggedInUser) {
    switch (req.query.extraInsights) {
      case 'hatched':
        filters.push('species.code IN (SELECT b.species FROM birdypets a JOIN variants b ON (a.variant = b.id) WHERE a.member = ?)');
        params.push(req.query.loggedInUser);
        break;
      case 'unhatched':
        filters.push('species.code NOT IN (SELECT b.species FROM birdypets a JOIN variants b ON (a.variant = b.id) WHERE a.member = ?)');
        params.push(req.query.loggedInUser);
        break;
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
        member: req.query.loggedInUser
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
