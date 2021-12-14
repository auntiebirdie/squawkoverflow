const Cache = require('./cache.js');
const Redis = require('./redis.js');

const ObjectHash = require('object-hash');
const ObjectSorter = require('sort-objects-array');

const birdsPerPage = 24;

class Search {
  get(kind, args) {
    this.model = require(`../models/${kind.toLowerCase()}.js`);
    this.identifier = kind == 'Bird' ? 'bird' : args.member;

    return new Promise(async (resolve, reject) => {
      var query = {
        member: args.member,
        flock: args.flock,
        family: args.family,
        sort: args.sort,
        search: args.search
      };

      var hash = ObjectHash(query);

      Redis.connect().sendCommand('ZCOUNT', [`search:${this.identifier}:${hash}`, '-inf', '+inf'], async (err, totalResults) => {
        if (err || !totalResults) {
          var totalResults = await this.refresh(kind, hash, query);
        }

        let promises = [];
        let totalPages = Math.ceil(totalResults / birdsPerPage);

        if (args.page) {
          var page = (args.page - 1) * birdsPerPage;

          if (args.sortDir == 'ASC') {
            var start = page;
            var end = (page + birdsPerPage);
          } else {
            var end = (page * -1) - 1;
            var start = end - birdsPerPage;
          }
        } else {
          var start = 0;
          var end = totalResults;
        }

        Redis.connect().sendCommand('ZRANGE', [`search:${this.identifier}:${hash}`, start, end], (err, results) => {
          if (args.page) {
            results = results.map((result) => {
              let model = new this.model(result);

              promises.push(model.fetch({
                include: ['memberData'],
                member: args.member
              }));

              return model;
            });
          }

          return Promise.all(promises).then(() => {
            if (args.sortDir == 'DESC') {
              results.reverse();
            }

            resolve({
              totalPages,
              results
            });
          });
        });
      });
    });
  }

  refresh(kind, hash, query) {
    return new Promise(async (resolve, reject) => {
	    //console.debug('SEARCH.REFRESH', kind, hash, this.identifier);
      Cache.get('aviary', this.identifier).then(async (results) => {
	      //console.debug('SEARCH.REFRESH results', kind, hash, results.length);
        var start = 0;
        var end = results.length;

        do {
          let promises = [];

          for (let i = start, len = Math.min(start + 250, end); i < len; i++, start++) {
            results[i] = new this.model(results[i]);

            promises.push(results[i].fetch());
          }

          await Promise.all(promises);

          promises = [];
        }
        while (start < end);

        if (query.search || query.family || query.flock) {
          var search = new RegExp(query.search);

          results = results.filter((result) => {
            if (query.search && !search.test([result.nickname, result.bird.name, result.name].filter((text) => typeof text !== "undefined").join(' '))) {
              return false;
            }

            if (query.family && result.bird.family != query.family) {
              return false;
            }

            if (query.flock) {
              if (query.flock == 'NONE' && result.flocks.length > 0) {
                return false;
              } else if (query.flock != 'NONE' && !result.flocks.includes(query.flock)) {
                return false;
              }
            }

            return true;
          });
        }

        if (query.sort) {
          results = ObjectSorter(results, query.sort, {
            order: 'asc',
            caseinsensitive: true
          });
        }

        return results.map((result) => result.id);
      });
    }).then((results) => {
      Redis.connect().del(`search:${this.identifier}:${hash}`);
      Redis.connect().sadd(`search:${this.identifier}`, hash);

      for (let i = 0, len = results.length; i < len; i++) {
        Redis.connect().zadd(`search:${this.identifier}:${hash}`, i, results[i]);
      }

      Redis.connect().sendCommand('EXPIRE', [`search:${this.identifier}:${hash}`, 86400]);

      return results.length;
    });
  }

  invalidate(identifier) {
    return new Promise((resolve, reject) => {
      Redis.connect().smembers(`search:${identifier}`, async (err, results) => {

        for (let result of results) {
          await Redis.connect().del(`search:${identifier}:${result}`);
        }

        resolve();
      });
    });
  }
}

module.exports = new Search;
