const Database = require('../helpers/database.js');
const Redis = require('../helpers/redis.js');

const hashify = require('object-hash');

class Search {
  query(kind, input) {
    return new Promise(async (resolve, reject) => {
      var perPage = input.perPage || 24;
      var page = (--input.page || 0);
      var output = [];

      let query = '';
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
          tables.push('species');

          if (input.style || input.artist || input.sort == 'variants') {
            tables.push('JOIN variants ON (species.id = variants.species)');
          }
          break;
        case 'birdypet':
          select.push('birdypets.id');
          tables.push('birdypets', 'JOIN variants ON (birdypets.variant = variants.id)', 'JOIN species ON (variants.species = species.id)');

          if (input.member) {
            filters.push('birdypets.member = ?');
            params.push(input.member);
          } else {
            filters.push('birdypets.member IS NOT NULL');
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
        case 'notification':
          select.push('notifications.id', 'notifications.type', 'notifications.data');
          tables.push('notifications');
          filters.push('notifications.member = ?');
          params.push(input.loggedInUser);
          break;
        case 'wishlist':
          select.push('species.id');
          tables.push('species', 'JOIN wishlist ON (species.id = wishlist.species AND wishlist.member = ? AND wishlist.intensity > 0)');
          params.push(input.id);
          break;
      }

      if (input.bird) {
        if (kind == 'birdypet') {
          filters.push('species.id = ?');
          params.push(input.bird);
        }
      }

      if (input.search) {
        let searchFields = {
          'commonName': 'species_names.name',
          'scientificName': 'species_names.name',
          'nickname': 'birdypets.nickname'
        };

        if (kind == 'artist') {
          select.push('MATCH(artists.name) AGAINST (?) relevancy');
          params.unshift(input.search);
          filters.push('MATCH(artists.name) AGAINST (?)');
          params.push(input.search);
        } else if (kind == 'member') {
          select.push('MATCH(members.username) AGAINST (?) + MAX(IF(members.username = ?, 10, 0)) relevancy');
          params.unshift(input.search, input.search);
          filters.push('MATCH(members.username) AGAINST (?)');
          params.push(input.search);
        } else {
          tables.push('JOIN species_names ON (species.id = species_names.species)');
          if (input.searchField == 'scientificName') {
            filters.push('species_names.lang = "zz"');
          } else {
            filters.push('species_names.lang != "zz"');
          }

          select.push(`MAX(MATCH(${searchFields[input.searchField] || 'species.commonName'}) AGAINST (?)) + MAX(IF(${searchFields[input.searchField]} = "black-headed gull", 10, 0)) relevancy`);
          params.unshift(input.search, input.search);
          filters.push(`MATCH(${searchFields[input.searchField] || 'species.commonName'}) AGAINST (?)`);
          params.push(input.search);
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
        if (!select.includes('')) {}
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

      if (input.type) {
        switch (input.type) {
          case 'birdypet_gift-thanked':
          case 'birdypet_gift-unthanked':
            filters.push("notifications.type = 'birdypet_gift'");
            filters.push("data->'$.thanked' " + (input.type == 'birdypet_gift-thanked' ? 'IS NOT' : 'IS') + " NULL");
            break;
          case 'birdypet_gift':
          case 'gift_thanks':
          case 'exchange_accepted':
          case 'site_update':
            filters.push('notifications.type = ?');
            params.push(input.type);
            break;
          case 'other':
            filters.push('notifications.type NOT IN ("birdypet_gift", "gift_thanks", "exchange_accepted", "site_update")');
            break;
        }
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
          params.push(input.style.toString().split(','));
        }
      }

      if (input.loggedInUser && Array.isArray(input.filters)) {
        var intensity = [];
        var isolated = false;
        var duplicated = false;

        for (let filter of input.filters) {
          let context = filter.split('-').pop();

          switch (filter.split('-').shift()) {
            case 'discovered':
              filters.push('(SELECT `count` FROM counters WHERE `member` = ? AND type = "birdypedia" AND id = species.id) > 0');
              params.push(input.memberData || input.loggedInUser);
              break;
            case 'undiscovered':
              filters.push('(SELECT IF(`count` = 0, NULL, 1) FROM counters WHERE `member` = ? AND type = "birdypedia" AND id = species.id) IS NULL');
              params.push(input.memberData || input.loggedInUser);
              break;
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
            case 'inFlock':
              filters.push('birdypets.id IN (SELECT a.birdypet FROM birdypet_flocks a WHERE a.flock = ?)');
              params.push(input.inFlock);
              break;
            case 'notInFlock':
              filters.push('birdypets.id NOT IN (SELECt a.birdypet FROM birdypet_flocks a WHERE a.flock = ?)');
              params.push(input.inFlock);
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

      query += 'SELECT ' + select.join(', ') + ' FROM ' + tables.join(' ');

      if (filters.length > 0) {
        query += ' WHERE ' + filters.join(' AND ');
      }

      if (kind == 'bird' || kind == 'wishlist') {
        query += ' GROUP BY species.id';
      } else if (kind == 'incubator') {
        query += ' GROUP BY variants.id';
      } else if (kind == 'birdypet' || kind == 'freebird') {
        query += ' GROUP BY birdypets.id';
      }

      Database.query(query, params).then(async (meta) => {
        let totalResults = meta.length;

        if (input.search) {
          query += ' HAVING relevancy >= ' + (meta[0].relevancy * .75);

		totalResults = meta.filter((metum) => metum.relevancy > (meta[0].relevancy * .75)).length;
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
            } else if (kind == 'notification') {
              query += 'notifications.createdAt';
            } else if (kind == 'incubator') {
              query += 'variants.addedAt';
            } else {
              query += 'species.commonName';
            }
        }

        query += ' ' + (input.sortDir == 'DESC' ? 'DESC' : 'ASC') + ' LIMIT ' + Math.min(page * perPage, totalResults) + ',' + perPage;

        Database.query(query, params).then((results) => {
          resolve({
            totalPages: Math.ceil(totalResults / perPage),
            totalResults,
            results
          });
        });
      });
    });
  }
}

module.exports = new Search;
