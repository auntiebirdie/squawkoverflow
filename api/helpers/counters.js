const Database = require('./database.js');
const Redis = require('./redis.js');
const Search = require('./search.js');

const Birds = require('../collections/birds.js');

class Counters {
  get(...args) {
    return new Promise((resolve, reject) => {
      Redis.connect('cache').get(args.join(':'), (err, value) => {
        if (err || value == null || typeof value == "undefined") {
          resolve(this.refresh(...args));
        } else {
          resolve(value * 1);
        }
      });
    });
  }

  refresh(...args) {
    return new Promise(async (resolve, reject) => {
      let promises = [];

      switch (args[0]) {
        case 'eggs':
          let eggs = require('../data/eggs.json');
          let value = 0;
          let start = 0;
          let end = eggs[args[2]].species.length;

          do {
            promises = [];

            for (let i = start, len = Math.min(end, start + 250); i < len; i++, start++) {
              promises.push(this.get('species', args[1], eggs[args[2]].species[i]));
            }

            await Promise.all(promises).then((responses) => {
              for (let response of responses) {
                if (response * 1 > 0) {
                  value++;
                }
              }
            });
          }
          while (start < end);

          resolve(value);

          break;
        case 'species':
          Database.fetch({
            kind: 'BirdyPet',
            filters: [
              ['member', '=', args[1]],
              ['speciesCode', '=', args[2]]
            ],
            keysOnly: true
          }).then((response) => {
            resolve(response.length * 1);
          });
          break;
        case 'birdypets':
          Database.fetch({
            kind: 'BirdyPet',
            filters: [
              ['member', '=', args[1]],
              ['illustration', '=', args[2]]
            ],
            keysOnly: true
          }).then((response) => {
            resolve(response.length * 1);
          });
          break;
        default:
          reject(404);
      }
    }).then(async (value) => {
      Redis.connect('cache').set(args.join(':'), value);
      Redis.connect('cache').sendCommand('EXPIRE', [args.join(':'), 604800]);

      return value;
    });
  }

  increment(value, ...args) {
    value *= 1;

    return new Promise((resolve, reject) => {
      this.get(...args).then(async (currValue) => {
        if (currValue + value >= 0) {
          let newValue = currValue + value;
          let promises = [];

          if (newValue < 2) {
            switch (args[0]) {
              case 'birdypets':
                let Illustration = require('../models/illustration.js');
                let illustration = new Illustration(args[2]);

                await illustration.fetch();

                promises.push(this.increment(newValue == 1 ? 1 : -1, 'species', args[1], illustration.bird.code));
                break;
              case 'species':
                let bird = Birds.findBy('speciesCode', args[2]);

                for (let adjective of bird.adjectives) {
                  promises.push(this.increment(newValue == 1 ? 1 : -1, 'eggs', args[1], adjective));
                }
                break;
            }
          }

          Redis.connect('cache').sendCommand('INCRBY', [args.join(':'), value]);
          Redis.connect("cache").sendCommand('EXPIRE', [args.join(':'), 604800]);

          if (args[0] == 'birdypets') {
            promises.push(Search.invalidate(args[1]));
          }

          Promise.all(promises).then(() => {
            resolve(newValue);
          });
        } else {
          resolve(currValue);
        }
      });
    });
  }
}

module.exports = new Counters;
