const Database = require('../helpers/database.js');
const BirdyPet = require('../models/birdypet.js');

module.exports = async (req, res) => {
  var birdsPerPage = 24;
  var page = (--req.query.page || 0) * birdsPerPage;
  var output = [];

  let query = 'SELECT birdypets.id';
  let filters = [];
  let params = [];

  if (req.query.search) {
    filters.push('(MATCH(birdypets.nickname) AGAINST (? IN BOOLEAN MODE) OR MATCH(species.commonName, species.scientificName) AGAINST (? IN BOOLEAN MODE))');

    var regex = new RegExp(/(\b[a-z\-\']+\b)/, 'gi');

    Array(2).fill(req.query.search).forEach((param) => params.push(param.replace(regex, '$1*')));
  }

  query += ' FROM birdypets JOIN variants ON (birdypets.variant = variants.id) JOIN species ON (species.code = variants.species)';
  filters.push('birdypets.member = ?');
  params.push(req.query.member);

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

  // TODO: validate user has access to extra insights
  if (req.query.loggedInUser && Array.isArray(req.query.extraInsights)) {
    for (let insight of req.query.extraInsights) {
      switch (insight) {
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
          params.push(req.query.member);
          break;
        case 'wanted':
          filters.push('species.code IN (SELECT a.species FROM wishlist a WHERE a.member = ? AND intensity = 1)');
          params.push(req.query.memberData || req.query.loggedInUser);
          break;
        case 'needed':
          filters.push('species.code IN (SELECT a.species FROM wishlist a WHERE a.member = ? AND intensity = 2)');
          params.push(req.query.memberData || req.query.loggedInUser);
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
      query += 'species.commonName';
      break;
    case 'friendship':
      query += 'birdypets.friendship';
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
