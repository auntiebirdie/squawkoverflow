const Database = require('../helpers/database.js');
const BirdyPet = require('../models/birdypet.js');

module.exports = async (req, res) => {
  var birdsPerPage = 24;
  var page = (--req.query.page || 0) * birdsPerPage;
  var output = [];

  let query = 'SELECT birdypets.id FROM birdypets JOIN variants ON (birdypets.variant = variants.id) JOIN species ON (species.code = variants.species)';
  let filters = ['birdypets.member = ?'];
  let params = [req.query.member];

  if (req.query.family) {
    filters.push('species.family = ?');
    params.push(req.query.family);
  }

  if (req.query.flock) {
    if (req.query.flock == "NONE") {
      filters.push('birdypets.id NOT IN (SELECT birdypet FROM birdypet_flocks)');
    } else {
      query += ' JOIN birdypet_flocks ON (birdypets.id = birdypet_flocks.birdypet)';
      filters.push('birdypet_flocks.flock = ?');
      params.push(req.query.flock);
    }
  }

  if (req.query.search) {
    filters.push('(birdypets.nickname LIKE ? OR species.commonName LIKE ? OR species.scientificName LIKE ?)');
    params.push(`%${req.query.search}%`);
    params.push(`%${req.query.search}%`);
    params.push(`%${req.query.search}%`);
  }

  // TODO: validate user has access to extra insights
  if (req.query.loggedInUser) {
    switch (req.query.extraInsights) {
      case 'hatched':
        filters.push('(SELECT `count` FROM counters WHERE `member` = ? AND type = "species" AND id = variants.species) > 0');
        params.push(req.query.loggedInUser);
        break;
      case 'unhatched':
        filters.push('(SELECT IF(`count` = 0, NULL, 1) FROM counters WHERE `member` = ? AND type = "species" AND id = variants.species) IS NULL');
        params.push(req.query.loggedInUser);
        break;
      case 'duplicated':
        filters.push('(SELECT `count` FROM counters WHERE `member` = ? AND type = "species" AND id = variants.species) > 1');
        params.push(req.query.loggedInUser);
        break;
      case 'wishlisted':
        filters.push('species.code IN (SELECT a.species FROM wishlist a WHERE a.member = ?)');
        params.push(req.query.memberData || req.query.loggedInUser);
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
      query += 'species.commonName';
      break;
    case 'hatchedAt':
    default:
      query += 'birdypets.hatchedAt';
  }

  query += ' ' + (req.query.sortDir == 'DESC' ? 'DESC' : 'ASC');

  Database.query(query, params).then((results) => {
    var totalPages = results.length;
    var promises = [];

    for (let i = page, len = Math.min(page + birdsPerPage, results.length); i < len; i++) {
      let result = new BirdyPet(results[i].id);

      promises.push(result.fetch({
	      include: req.query.memberData ? ['memberData'] : [],
	      member: req.query.memberData
      }));

      output.push(result);
    }

    Promise.all(promises).then(() => {
      res.json({
        totalPages: Math.ceil(totalPages / birdsPerPage),
        results: output
      });
    });
  });
};
