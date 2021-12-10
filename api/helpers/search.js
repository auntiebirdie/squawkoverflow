const Database = require('./database.js');
const Redis = require('./redis.js');

const ObjectHash = require('object-hash');
const ObjectSorter = require('sort-objects-array');

const birdsPerPage = 24;

class Search {
  get(kind, args) {
    this.model = require(`../models/${kind.toLowerCase()}.js`);
    this.identifier = kind == 'Bird' ? 'bird' : args.member;

    return new Promise((resolve, reject) => {
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
          totalResults = await this.refresh(kind, hash, query);
        }

        if (args.page) {
          var page = (args.page - 1) * birdsPerPage;
          let totalPages = Math.ceil(totalResults / 24);
          let promises = [];

          if (args.sortDir == 'ASC') {
            var start = page;
            var end = (page + birdsPerPage) - 1;
          } else {
            var end = (page * -1) - 1;
            var start = page - birdsPerPage;
          }

          Redis.connect().sendCommand('ZRANGE', [`search:${this.identifier}:${hash}`, start, end], (err, results) => {
            results = results.map((result) => {
              let model = new this.model(result);

              promises.push(model.fetch({
                include: ['memberData'],
                member: args.member
              }));

              return model;
            });

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
        } else {
          if (args.sortDir == 'DESC') {
            results.reverse();
          }

          resolve(results);
        }
      });
    });
  }

  refresh(kind, hash, query) {
    return new Promise(async (resolve, reject) => {
      if (query.search) {
        await this.get(kind, {
          member: query.member,
          family: query.family,
          flocks: query.flock,
          sort: query.sort
        }).then((results) => resolve);
      } else {
        var filters = [];

        if (kind == 'Bird') {
          filters.push(['type', '=', 'species']);
        } else if (query.member) {
          filters.push(['member', '=', query.member]);
        }

        if (query.family) {
          filters.push(['family', '=', query.family]);
        }

        if (query.flock) {
          filters.push(['flocks', '=', query.flock]);
        }

        await Database.fetch({
          kind: kind,
          filters: filters,
          keysOnly: true
        }).then(async (results) => {
          results = results.map((result) => result[Database.KEY].name);

          resolve(results);
        });
      }
    }).then(async (results) => {
      if (query.search || query.sort) {
        var start = 0;
        var end = results.length;
        var sort = [];

        do {
          let promises = [];

          for (let i = start, len = Math.min(start + 250, end); i < len; i++, start++) {
            results[i] = new this.model(results[i]);

            promises.push(results[i].fetch({
              fields: [sort[0]]
            }));
          }

          await Promise.all(promises);

          if (query.search) {
            let search = new RegExp(query.search);

            results.filter((resultt) => search.text([result.nickname, result.bird?.name, result.name].filter((text) => typeof text !== "undefined").join(' ')));
          }

          promises = [];
        }
        while (start < end)

        if (!query.search && query.sort) {
          results = ObjectSorter(results, query.sort, {
            order: 'asc',
            caseinsensitive: true
          });
        }

        return results.map((result) => result.id);
      } else {
        return results;
      }
    }).then((results) => {
      Redis.delete(`search:${this.identifier}:${hash}`);

      for (let i = 0, len = results.length; i < len; i++) {
        Redis.connect().zadd(`search:${this.identifier}:${hash}`, i, results[i]);
      }

      Redis.connect().sendCommand('EXPIRE', [`search:${this.identifier}:${hash}`, 86400]);

      return results.length;
    });
  }

  invalidate(identifier) {
    return new Promise((resolve, reject) => {
      Redis.scan(`search:${identifier}`).then((results) => {
        for (let result of results) {
          Redis.connect().del(result);
        }

        resolve();
      });
    });
  }
}

module.exports = new Search;
