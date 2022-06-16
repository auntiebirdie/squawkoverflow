const Database = require('../helpers/database.js');
const Member = require('../models/member.js');

class Search {
  query(kind, input) {
    return new Promise(async (resolve, reject) => {
      var perPage = input.perPage || 24;
      var page = (--input.page || 0) * perPage;
      var output = [];

      let query = 'SELECT ';
      let select = [];
      let tables = [];
      let filters = [];
      let params = [];

      switch (kind) {
        case 'artist':
          select.push('artists.name', 'artists.numVariants', 'artists.numIllustrations', 'artists.numPhotos');
          tables.push('artists');
          filters.push('artists.numVariants > 0');
          break;
        case 'bird':
          select.push('DISTINCT species.id');
          tables.push('species', 'JOIN variants ON (species.id = variants.species)');
          break;
        case 'birdypet':
          select.push('birdypets.id');
          tables.push('birdypets', 'JOIN variants ON (birdypets.variant = variants.id)', 'JOIN species ON (variants.species = species.id)');

          if (input.member) {
            filters.push('birdypets.member = ?');
            params.push(input.member);
          }

          if (!input.member || input.member != input.loggedInUser) {
            filters.push('birdypets.id NOT IN (SELECT birdypet FROM birdypet_flocks JOIN flocks ON (birdypet_flocks.flock = flocks.id) WHERE flocks.private = 1)');
          }
          break;
        case 'freebird':
          select.push('birdypets.id', 'birdypets.variant', 'birdypets.nickname');
          tables.push('birdypets', 'JOIN variants ON (birdypets.variant = variants.id)', 'JOIN species ON (variants.species = species.id)');
          filters.push('birdypets.member IS NULL AND birdypets.addedAt <= DATE_SUB(NOW(), INTERVAL 10 MINUTE)');
          break;
        case 'incubator':
          select.push('variants.id');
          tables.push('variants', 'JOIN member_variants ON (variants.id = member_variants.variant)', 'JOIN species ON (variants.species = species.id)');
          filters.push('member_variants.member = ?');
          params.push(input.loggedInUser);
          break;
        case 'member':
          select.push('members.id');
          tables.push('members', 'LEFT JOIN counters ON (counters.member = members.id AND counters.type = "aviary" AND counters.id = "total")');
          break;
        case 'wishlist':
          select.push('species.id');
          tables.push('species', 'JOIN wishlist ON (species.id = wishlist.species AND wishlist.member = ? AND wishlist.intensity > 0)');
          params.push(input.id);
          break;
      }

      if (input.search) {
        let exactMatch = input.search.match(/^\"(.*)\"$/);
        let searchFields = {
          'commonName': 'species.cleanName',
          'scientificName': 'species.scientificName',
          'nickname': 'birdypets.nickname'
        };

        if (exactMatch) {
          input.search = exactMatch[1];
        } else {
          input.search = input.search.replace(/\'/g, '').replace(/\-/g, ' ');
        }

        if (kind == 'artist') {
          filters.push(exactMatch ? 'artists.name = ?' : 'MATCH(artists.name) AGAINST (?)');
          params.push(input.search);
        } else if (kind == 'member') {
          filters.push(exactMatch ? 'members.username = ?' : 'MATCH(members.username) AGAINST (?)');
          params.push(input.search);
        } else {
          if (exactMatch) {
            filters.push(`${searchFields[input.searchField] || 'species.cleanName'} = ?`);
            params.push(input.search);
          } else {
            select.push(`MATCH(${searchFields[input.searchField] || 'species.cleanName'}) AGAINST (?) relevancy`);
            params.unshift(input.search);
            filters.push(`MATCH(${searchFields[input.searchField] || 'species.cleanName'}) AGAINST (?)`);
            params.push(input.search);
          }
        }
      }

      if (input.species) {
        filters.push('species.id = ?');
        params.push(input.species);
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
        tables.push(' JOIN species_adjectives ON (species.id = species_adjectives.species)');
        filters.push('species_adjectives.adjective = ?');
        params.push(input.adjectives);
      }

      if (input.artist) {
        filters.push('variants.credit = ?');
        params.push(input.artist);
      }

      if (input.intensity) {
        filters.push('wishlist.intensity IN (?)');
        params.push(input.intensity);
      }

      if (input.exchangeData) {
        filters.push('birdypets.id NOT IN (SELECT birdypet FROM birdypet_flocks JOIN flocks ON (birdypet_flocks.flock = flocks.id) WHERE flocks.protected = 1)');
      }

      if (input.style) {
        if (kind == 'artist') {
          switch (input.style) {
            case 1:
            case '1':
              filters.push('numIllustrations > 0 AND numPhotos = 0');
              break;
            case 2:
            case '2':
              filters.push('numIllustrations = 0 AND numPhotos > 0');
              break;
          }
        } else {
          filters.push('variants.style IN (?)');
          params.push(input.style.split(','));
        }
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

      query += select.join(', ') + ' FROM ' + tables.join(' ');

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

	    console.log(query, params);

      Database.query(query, params).then((results) => {
        if (results.length > 0 && results[0].relevancy) {
          let maxRelevancy = Math.max(...results.map((result) => result.relevancy));
          results = results.filter((result) => result.relevancy >= (maxRelevancy * .75));
        }

        var totalPages = results.length;

        for (let i = page, len = Math.min(page + perPage, results.length); i < len; i++) {
          output.push(results[i]);
        }

        resolve({
          totalPages: Math.ceil(totalPages / perPage),
          totalResults: results.length,
          results: output
        });
      });
    });
  }
}

module.exports = new Search;
