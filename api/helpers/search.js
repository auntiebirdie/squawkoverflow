const Database = require('../helpers/database.js');

class Search {
  query(kind, input) {
    return new Promise((resolve, reject) => {
      var birdsPerPage = 24;
      var page = (--input.page || 0) * birdsPerPage;
      var output = [];

      let query = 'SELECT ';
      let filters = [];
      let params = [];

      if (input.search) {
        filters.push('MATCH(species.commonName, species.scientificName) AGAINST (? IN BOOLEAN MODE)');

        var regex = new RegExp(/(\b[a-z\-\']+\b)/, 'gi');

        Array(1).fill(input.search).forEach((param) => params.push(param.replace(regex, '$1*')));
      }

      switch (kind) {
        case 'freebird':
          query += ' freebirds.id, freebirds.variant FROM freebirds JOIN variants ON (freebirds.variant = variants.id) JOIN species ON (variants.species = species.code)';
          break;
        case 'bird':
          query += ' species.code FROM species';
          break;
        case 'wishlist':
          query += ' species.code FROM species JOIN wishlist ON (species.code = wishlist.species AND wishlist.member = ? AND wishlist.intensity > 0)';
          params.push(input.id);
          break;
      }

      if (input.family) {
        filters.push('species.family = ?');
        params.push(input.family);
      }

      if (input.adjectives) {
        query += ' JOIN species_adjectives ON (species.code = species_adjectives.species)';
        filters.push('species_adjectives.adjective = ?');
        params.push(input.adjectives);
      }

      if (input.artist) {
        filters.push('species.code IN (SELECT a.species FROM variants a WHERE a.credit = ?)');
        params.push(input.artist);
      }

      if (input.intensity) {
        filters.push('wishlist.intensity IN (?)');
        params.push(input.intensity);
      }

      // TODO: validate user has access to extra insights
      if (input.loggedInUser && Array.isArray(input.extraInsights)) {
        for (let insight of input.extraInsights) {
          switch (insight) {
            case 'hatched':
              filters.push('(SELECT `count` FROM counters WHERE `member` = ? AND type = "species" AND id = species.code) > 0');
              params.push(input.memberData || input.loggedInUser);
              break;
            case 'unhatched':
              filters.push('(SELECT IF(`count` = 0, NULL, 1) FROM counters WHERE `member` = ? AND type = "species" AND id = species.code) IS NULL');
              params.push(input.memberData || input.loggedInUser);
              break;
            case 'duplicated':
              filters.push('species.code IN (SELECT id FROM counters WHERE type = "species" AND `member` = ? AND `count` > 1)');
              params.push(input.memberData || input.loggedInUser);
              break;
            case 'wanted':
              filters.push('species.code IN (SELECT a.species FROM wishlist a WHERE a.member = ? AND intensity = 1)');
              params.push(input.memberData || input.loggedInUser);
              break;
            case 'needed':
              filters.push('species.code IN (SELECT a.species FROM wishlist a WHERE a.member = ? AND intensity = 2)');
              params.push(input.memberData || input.loggedInUser);
              break;
            case 'wishlisted':
              filters.push('species.code IN (SELECT a.species FROM wishlist a WHERE a.member = ? AND intensity > 0)');
              params.push(input.memberData || input.loggedInUser);
              break;
            case 'unwishlisted':
              filters.push('species.code NOT IN (SELECT a.species FROM wishlist a WHERE a.member = ? AND intensity > 0)');
              params.push(input.memberData || input.loggedInUser);
              break;
            case 'somewhere':
              filters.push('species.code IN (SELECT id FROM counters WHERE type = "species" AND `count` > 0)');
              break;
          }
        }
      }

      if (filters.length > 0) {
        query += ' WHERE ' + filters.join(' AND ');
      }

      query += ' ORDER BY ';

      switch (input.sort) {
        case 'scientificName':
          query += 'species.scientificName';
          break;
        case 'friendship':
          query += 'birdypets.friendship';
          break;
        case 'hatchedAt':
          query += 'birdypets.hatchedAt';
          break;
        case 'freedAt':
          query += 'freebirds.freedAt';
          break;
        case 'commonName':
          query += 'species.commonName';
          break;
        default:
          if (kind == 'birdypet') {
            query += 'birdypets.hatchedAt';
          } else {
            query += 'species.commonName';
          }
      }

      query += ' ' + (input.sortDir == 'DESC' ? 'DESC' : 'ASC');

      Database.query(query, params).then((birds) => {
        var totalPages = birds.length;

        for (let i = page, len = Math.min(page + birdsPerPage, birds.length); i < len; i++) {
          output.push(birds[i]);
        }

        resolve({
          totalPages: Math.ceil(totalPages / birdsPerPage),
          results: output
        });
      });
    });
  }
}

module.exports = new Search;