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

      switch (kind) {
        case 'bird':
          query += 'species.code FROM species';
          filters.push('species.code IN (SELECT species FROM variants)');
          break;
        case 'birdypet':
          query += 'birdypets.id FROM birdypets JOIN variants ON (birdypets.variant = variants.id) JOIN species ON (variants.species = species.code)';
          filters.push('birdypets.member = ?');
          params.push(input.member);

          if (input.member != input.loggedInUser) {
            filters.push('birdypets.id NOT IN (SELECT birdypet FROM birdypet_flocks JOIN flocks ON (birdypet_flocks.flock = flocks.id) WHERE flocks.private = 1)');
          }
          break;
        case 'freebird':
          query += 'freebirds.id, freebirds.variant FROM freebirds JOIN variants ON (freebirds.variant = variants.id) JOIN species ON (variants.species = species.code)';
          break;
        case 'member':
          query += 'members.id, members.username, members.avatar FROM members';
          break;
        case 'wishlist':
          query += 'species.code FROM species JOIN wishlist ON (species.code = wishlist.species AND wishlist.member = ? AND wishlist.intensity > 0)';
          params.push(input.id);
          break;
      }

      if (input.search) {
        if (kind == 'birdypet') {
          filters.push('(MATCH(birdypets.nickname) AGAINST (? IN BOOLEAN MODE) OR MATCH(species.commonName, species.scientificName) AGAINST (? IN BOOLEAN MODE))');

          var regex = new RegExp(/(\b[a-z\-\']+\b)/, 'gi');

          Array(2).fill(input.search).forEach((param) => params.push(param.replace(regex, '$1*')));
        } else {
          filters.push('MATCH(species.commonName, species.scientificName) AGAINST (? IN BOOLEAN MODE)');

          var regex = new RegExp(/(\b[a-z\-\']+\b)/, 'gi');

          Array(1).fill(input.search).forEach((param) => params.push(param.replace(regex, '"$1"')));
        }
      }

      if (input.family) {
        filters.push('species.family = ?');
        params.push(input.family);
      }

      if (input.flock) {
        if (input.flock == "NONE") {
          filters.push('birdypets.id NOT IN (SELECT a.birdypet FROM birdypet_flocks AS a)');
        } else {
          filters.push('birdypets.id IN (SELECT a.birdypet FROM birdypet_flocks AS a WHERE a.flock = ?)');
          params.push(input.flock);
        }
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

      if (input.exchangeData) {
        filters.push('birdypets.id NOT IN (SELECT birdypet FROM birdypet_flocks JOIN flocks ON (birdypet_flocks.flock = flocks.id) WHERE flocks.protected = 1)');
      }

      // TODO: validate user has access to extra insights
      if (input.loggedInUser && Array.isArray(input.extraInsights)) {
        var intensity = [];
        var isolated = false;
        var duplicated = false;

        for (let insight of input.extraInsights) {
          let context = insight.split('-').pop();

          switch (insight.split('-').shift()) {
            case 'hatched':
              filters.push('(SELECT `count` FROM counters WHERE `member` = ? AND type = "species" AND id = species.code) > 0');
              params.push(input.memberData || input.loggedInUser);
              break;
            case 'unhatched':
              filters.push('(SELECT IF(`count` = 0, NULL, 1) FROM counters WHERE `member` = ? AND type = "species" AND id = species.code) IS NULL');
              params.push(input.memberData || input.loggedInUser);
              break;
            case 'isolated':
              isolated = context;
              break;
            case 'duplicated':
              duplicated = context;
              break;
            case 'wanted':
              intensity.push(1);
              break;
            case 'needed':
              intensity.push(2);
              break;
            case 'wishlisted':
              filters.push('species.code IN (SELECT a.species FROM wishlist a WHERE a.member = ? AND intensity > 0)');
              params.push(input.memberData || input.loggedInUser);
              break;
            case 'unwishlisted':
              filters.push('species.code NOT IN (SELECT a.species FROM wishlist a WHERE a.member = ? AND intensity > 0)');
              params.push(input.memberData || input.loggedInUser);
              break;
            case 'someone':
              filters.push('species.code IN (SELECT a.species FROM wishlist a JOIN members b ON (a.member = b.id) WHERE intensity > 0 AND b.id NOT IN (SELECT `member` FROM member_settings WHERE setting = "privacy_gifts"))');
              break;
            case 'somewhere':
              filters.push('species.code IN (SELECT id FROM counters WHERE type = "species" AND `count` > 0)');
              break;
          }
        }

        if (intensity.length > 0) {
          filters.push('species.code IN (SELECT a.species FROM wishlist a WHERE a.member = ? AND intensity IN (?))');
          params.push(input.memberData || input.loggedInUser, intensity);
        }

        if (isolated || duplicated) {
          filters.push('species.code IN (SELECT id FROM counters WHERE type = "species" AND `member` = ? AND `count` ' + (isolated && duplicated ? '>= 1' : (isolated ? '= 1' : '> 1')) + ')');

          if (kind == "wishlist") {
            params.push(input.loggedInUser);
          } else {
            params.push((isolated || duplicated) == 'My' ? input.loggedInUser : input.memberData);
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
        case 'addedAt':
          query += 'wishlist.addedAt';
          break;
        case 'commonName':
          query += 'species.commonName';
          break;
        default:
          if (kind == 'birdypet') {
            query += 'birdypets.hatchedAt';
          } else if (kind == 'member') {
		  query += 'members.username';
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
          totalResults: birds.length,
          results: output
        });
      });
    });
  }
}

module.exports = new Search;
