const Cache = require('./cache.js');
const Database = require('./database.js');
const Redis = require('./redis.js');

const ObjectHash = require('object-hash');
const ObjectSorter = require('sort-objects-array');

const birdsPerPage = 24;

class Search {
  get(args) {
    this.model = require(`../models/birdypet.js`);
    this.identifier = args.member;

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
          var totalResults = await this.refresh(hash, query);
        }

        let promises = [];
        let totalPages = Math.ceil(totalResults / birdsPerPage);

        if (args.page) {
          var page = (args.page - 1) * birdsPerPage;

          if (args.sortDir == 'ASC') {
            var start = page;
            var end = (page + birdsPerPage) - 1;
          } else {
            var end = (page * -1) - 1;
            var start = end - birdsPerPage + 1;
          }
        } else {
          var start = 0;
          var end = totalResults;
        }

        Redis.connect().sendCommand('ZRANGE', [`search:${this.identifier}:${hash}`, start, end], (err, results) => {
          results = results.map((result) => {
            let model = new this.model(result);

            promises.push(model.fetch({
              include: ['memberData'],
              member: args.memberData || args.member
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
      });
    });
  }

  refresh(hash, args) {
    return new Promise(async (resolve, reject) => {
      let query = '';
      let filters = [];
      let params = [];

      /*
       *   page: '1',
        sort: 'hatchedAt',
        sortDir: 'DESC',
        family: '',
        flock: '',
        search: '',
        member: '121294882861088771',
        memberData: '121294882861088771',
        loggedInUser: '121294882861088771'
        */

      query = 'SELECT birdypets.id FROM birdypets';

      if (args.family) {
        query += ' JOIN variants ON (birdypets.variant = variants.id)';
	      query += ' JOIN species ON (variants.species = species.code)';
        filters.push('species.taxonomy = ?');
        params.push(args.family);
      }

      if (args.flock) {
        query += ' JOIN birdypet_flocks ON (birdypets.id = birdypet_flocks.birdypet)';
        filters.push('birdypet_flocks.flock = ?');
        params.push(args.flock);
      }

      query += ' WHERE ';

      filters.push('birdypets.member = ?');
      params.push(args.member);

      query += filters.join(' AND ');

      switch (args.sort) {
        case "hatchedAt":
          query += ` ORDER BY ${args.sort} ASC`;
          break;
      }

      Database.query(query, params).then(async (results) => {
        var start = 0;
        var end = results.length;

        resolve(results.map((result) => result.id));
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

        await Redis.connect().del(`search:${identifier}`);

        resolve();
      });
    });
  }
}

module.exports = new Search;
