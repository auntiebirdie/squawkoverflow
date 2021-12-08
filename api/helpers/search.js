const Database = require('./database.js');
const Redis = require('./redis.js');

const ObjectHash = require('object-hash');
const ObjectSorter = require('sort-objects-array');

class Search {
  get(kind, args) {
    this.model = require(`../models/${kind.toLowerCase()}.js`);
    this.identifier = kind == 'Bird' ? 'bird' : query.member;

    return new Promise((resolve, reject) => {
      var query = {
        member: args.member,
        flock: args.flock,
        family: args.family,
        sort: args.sort,
        search: args.search,
      };

      var hash = ObjectHash(query);

      Redis.connect('cache').smembers(`search:${this.identifier}:${hash}`, (err, values) => {
        if (err || values.length == 0) {
          resolve(this.refresh(kind, hash, query));
        } else {
          resolve(values);
        }
      });
    }).then((results) => {
      if (args.page) {
        let start = (args.page - 1) * 24;
        let totalPages = Math.ceil(results.length / 24);
        let promises = [];

        results = results.slice(start, start + 24).map((result) => {
          let model = new this.model(result);

          promises.push(model.fetch({
            include: ['memberData'],
            member: args.member
          }));

          return model;
        });

        return Promise.all(promises).then(() => {
          return {
            totalPages,
            results
          };
        });
      } else {
        return results;
      }
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
      if (query.search || (query.sort && query.sort != '[]')) {
        var start = 0;
        var end = results.length;
        var sort = [];

        try {
          sort = typeof query.sort == "string" ? JSON.parse(query.sort) : query.sort;
        } catch (err) {
          console.debug(err);
        }

        do {
          let promises = [];

          for (let i = start, len = Math.min(start + 250, end); i < len; i++, start++) {
            results[i] = new this.model(results[i]);

            promises.push(results[i].fetch({
              fields: [sort[0]]
            }));
          }

          await Promise.all(promises);

          promises = [];
        }
        while (start < end)


        if (query.search) {
          let search = new RegExp(query.search);

          results.filter((result) => search.test([result.nickname, result.bird?.name, result.name].filter((text) => typeof text !== "undefined").join(' ')));
        } else if (query.sort != '[]') {
          let sort = typeof query.sort == "string" ? JSON.parse(query.sort) : query.sort;

          results = ObjectSorter(results, sort[0], {
            order: (sort[1] ? sort[1].toLowerCase() : 'asc'),
            caseinsensitive: true
          });
        }

        return results.map((result) => result.id);
      } else {
        return results;
      }
    }).then((results) => {
      Redis.connect('cache').del(`search:${this.identifier}:${hash}`);
      Redis.connect('cache').sadd(`search:${this.identifier}:${hash}`, results);
      Redis.connect('cache').sendCommand('EXPIRE', [`search:${this.identifier}:${hash}`, 86400]);

      return results;
    });
  }

  invalidate(identifier) {
    return new Promise((resolve, reject) => {
      Redis.scan('cache', `search:${identifier}`).then((results) => {
        for (let result of results) {
          Redis.connect('cache').del(result);
        }

        resolve();
      });
    });
  }
}

module.exports = new Search;
