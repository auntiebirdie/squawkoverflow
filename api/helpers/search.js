const Database = require('../helpers/database.js');
const Member = require('../models/member.js');

class Search {
  query(kind, input) {
    return new Promise(async (resolve, reject) => {
      var perPage = input.perPage || 24;
      var page = (--input.page || 0) * perPage;
      var output = [];

      let query = 'SELECT ';
      let filters = [];
      let params = [];

      switch (kind) {
        case 'artist':
          query += 'artists.name, artists.numVariants, artists.numIllustrations, artists.numPhotos FROM artists';
          filters.push('artists.numVariants > 0');
          break;
        case 'bird':
          query += 'DISTINCT species.id FROM species JOIN variants ON (species.id = variants.species)';
          break;
        case 'birdypet':
          query += 'birdypets.id FROM birdypets JOIN variants ON (birdypets.variant = variants.id) JOIN species ON (variants.species = species.id)';
          filters.push('birdypets.member = ?');
          params.push(input.member);

          if (input.member != input.loggedInUser) {
            filters.push('birdypets.id NOT IN (SELECT birdypet FROM birdypet_flocks JOIN flocks ON (birdypet_flocks.flock = flocks.id) WHERE flocks.private = 1)');
          }
          break;
        case 'freebird':
          query += 'birdypets.id, birdypets.variant, birdypets.nickname FROM birdypets JOIN variants ON (birdypets.variant = variants.id) JOIN species ON (variants.species = species.id)';
          filters.push('birdypets.member IS NULL AND birdypets.addedAt <= DATE_SUB(NOW(), INTERVAL 10 MINUTE)');
          break;
        case 'incubator':
          query += 'variants.id FROM variants JOIN member_variants ON (variants.id = member_variants.variant) JOIN species ON (variants.species = species.id)';
          filters.push('member_variants.member = ?');
          params.push(input.loggedInUser);
          break;
        case 'member':
          query += 'members.id FROM members LEFT JOIN counters ON (counters.member = members.id AND counters.type = "aviary" AND counters.id = "total")';
          break;
        case 'wishlist':
          query += 'species.id FROM species JOIN wishlist ON (species.id = wishlist.species AND wishlist.member = ? AND wishlist.intensity > 0)';
          params.push(input.id);
          break;
      }

      if (input.search) {
        let exactMatch = input.search.match(/^\"(.*)\"$/);

        if (exactMatch) {
          input.search = exactMatch[1];
        } else {
          input.search = '("' + input.search + '")';
        }

        if (kind == 'artist') {
          filters.push(exactMatch ? 'artists.name = ?' : 'MATCH(artists.name) AGAINST (? IN BOOLEAN MODE)');
          params.push(input.search);
        } else if (kind == 'member') {
          filters.push(exactMatch ? 'members.username = ?' : 'MATCH(members.username) AGAINST (? IN BOOLEAN MODE)');
          params.push(input.search);
        } else if (kind == 'birdypet') {
          filters.push(exactMatch ? '(birdypets.nickname = ? OR species.commonName = ? OR species.scientificName = ?)' : '(MATCH(birdypets.nickname) AGAINST (? IN BOOLEAN MODE) OR MATCH(species.commonName, species.scientificName) AGAINST (? IN BOOLEAN MODE))');
          if (exactMatch) {
            params.push(input.search);
          }
          params.push(input.search, input.search);
        } else {
          filters.push(exactMatch ? '(species.commonName = ? OR species.scientificName = ?)' : 'MATCH(species.commonName, species.scientificName) AGAINST (? IN BOOLEAN MODE)');
          if (exactMatch) {
            params.push(input.search);
          }
          params.push(input.search);
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

      if (input.flocks) {
        if (input.flocks.includes("NONE")) {
          filters.push('birdypets.id NOT IN (SELECT a.birdypet FROM birdypet_flocks AS a)');
        } else {
          for (let flock of input.flocks) {
            filters.push('birdypets.id IN (SELECT a.birdypet FROM birdypet_flocks AS a WHERE a.flock = ?)');
            params.push(flock);
          }
        }
      }

      if (input.adjectives) {
        query += ' JOIN species_adjectives ON (species.id = species_adjectives.species)';
        filters.push('species_adjectives.adjective = ?');
        params.push(input.adjectives);
      }

      if (input.artist) {
        filters.push('species.id IN (SELECT a.species FROM variants a WHERE a.credit = ?)');
        params.push(input.artist);
      }

      if (input.intensity) {
        filters.push('wishlist.intensity IN (?)');
        params.push(input.intensity);
      }

      if (input.exchangeData) {
        filters.push('birdypets.id NOT IN (SELECT birdypet FROM birdypet_flocks JOIN flocks ON (birdypet_flocks.flock = flocks.id) WHERE flocks.protected = 1)');
      }

      if (input.loggedInUser && (Array.isArray(input.filters) || Array.isArray(input.extraFilters))) {
        if (Array.isArray(input.extraFilters)) {
          let member = new Member(input.loggedInUser);

          await member.fetch();

          if (member.tier.extraInsights) {
            input.filters = Array.isArray(input.filters) ? [...input.filters, ...input.extraFilters] : input.extraFilters;
          }
        }

        var intensity = [];
        var isolated = false;
        var duplicated = false;

        for (let filter of input.filters) {
          let context = filter.split('-').pop();

          switch (filter.split('-').shift()) {
            case 'hatched':
              filters.push('(SELECT `count` FROM counters WHERE `member` = ? AND type = "species" AND id = species.id) > 0');
              params.push(input.memberData || input.loggedInUser);
              break;
            case 'unhatched':
              filters.push('(SELECT IF(`count` = 0, NULL, 1) FROM counters WHERE `member` = ? AND type = "species" AND id = species.id) IS NULL');
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
              filters.push('species.id IN (SELECT a.species FROM wishlist a WHERE a.member = ? AND intensity > 0)');
              params.push(input.memberData || input.loggedInUser);
              break;
            case 'unwishlisted':
              filters.push('species.id NOT IN (SELECT a.species FROM wishlist a WHERE a.member = ? AND intensity > 0)');
              params.push(input.memberData || input.loggedInUser);
              break;
            case 'someone':
              filters.push('species.id IN (SELECT a.species FROM wishlist a JOIN members b ON (a.member = b.id) WHERE intensity > 0 AND b.id NOT IN (SELECT `member` FROM member_settings WHERE setting = "privacy_gifts"))');
              break;
            case 'somewhere':
              filters.push('species.id IN (SELECT id FROM counters WHERE type = "species" AND `count` > 0)');
              break;
            case 'copied':
              filters.push('species.id IN (SELECT id FROM counters WHERE `member` = "freebirds" AND type = "species" AND `count` > 1)');
              break;
            case 'exchange':
              filters.push('birdypets.id IN (SELECT birdypet FROM exchange_birdypets WHERE exchange = ?)');
              params.push(input.exchangeData);
              break;
            case 'unexchange':
              filters.push('birdypets.id NOT IN (SELECT birdypet FROM exchange_birdypets WHERE exchange = ?)');
              params.push(input.exchangeData);
              break;
            case 'active':
              filters.push('members.lastActivityAt > DATE_SUB(NOW(), INTERVAL 6 MONTH)');
              break;
          }
        }

        if (intensity.length > 0) {
          filters.push('species.id IN (SELECT a.species FROM wishlist a WHERE a.member = ? AND intensity IN (?))');
          params.push(input.memberData || input.loggedInUser, intensity);
        }

        if (isolated || duplicated) {
          filters.push('species.id IN (SELECT id FROM counters WHERE type = "species" AND `member` = ? AND `count` ' + (isolated && duplicated ? '>= 1' : (isolated ? '= 1' : '> 1')) + ')');

          if (kind == "wishlist") {
            params.push(input.loggedInUser);
          } else {
            params.push((isolated || duplicated) == 'My' ? input.loggedInUser : input.member);
          }
        }
      }

      if (filters.length > 0) {
        query += ' WHERE ' + filters.join(' AND ');
      }

      if (kind == 'bird') {
        query += ' GROUP BY species.id';
      }

      query += ' ORDER BY ';

      switch (input.sort) {
        case 'commonName':
          query += 'species.commonName';
          break;
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
          query += 'birdypets.addedAt';
          break;
        case 'addedAt':
          if (kind == 'birdypet') {
            query += 'birdypets.addedAt';
          } else if (kind == 'wishlist') {
            query += 'wishlist.addedAt';
          } else if (kind == 'incubator') {
            query += 'variants.addedAt';
          }
          break;
        case 'joinedAt':
          query += 'members.joinedAt';
          break;
        case 'activeAt':
          query += 'members.lastActivityAt';
          break;
        case 'username':
          query += 'members.username';
          break;
        case 'aviary':
          query += 'counters.count';
          break;
        case 'variants':
          query += 'MAX(variants.addedAt)';
          break;
        default:
          if (kind == 'artist') {
            query += 'artists.name';
          } else if (kind == 'birdypet') {
            query += 'birdypets.addedAt';
          } else if (kind == 'member') {
            query += 'members.username';
          } else if (kind == 'incubator') {
            query += 'variants.addedAt';
          } else {
            query += 'species.commonName';
          }
      }

      query += ' ' + (input.sortDir == 'DESC' ? 'DESC' : 'ASC');

      Database.query(query, params).then((birds) => {
        var totalPages = birds.length;

        for (let i = page, len = Math.min(page + perPage, birds.length); i < len; i++) {
          output.push(birds[i]);
        }

        resolve({
          totalPages: Math.ceil(totalPages / perPage),
          totalResults: birds.length,
          results: output
        });
      });
    });
  }
}

module.exports = new Search;
