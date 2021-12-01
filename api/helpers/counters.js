const Database = require('./database.js');
const Redis = require('./redis.js');

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
    return new Promise((resolve, reject) => {
      let promises = [];

      switch (args[0]) {
        case 'eggs':
          let eggs = require('../data/eggs.json');

          for (let species of eggs[args[2]].species) {
            promises.push(this.get('species', args[1], species));
          }

          Promise.all(promises).then((responses) => {
            let value = 0;

            for (var response of responses) {
              value += response * 1;
            }

            resolve(value);
          });

          break;
        case 'species':
          Redis.fetch('memberpet', {
            'FILTER': `@member:{${args[1]}} @birdypetSpecies:{${args[2]}}`,
            'COUNT': true
          }).then((response) => {
            resolve(response.count * 1);
          });
          break;
      }
    }).then(async (value) => {
      await Redis.connect('cache').set(args.join(':'), value);
      await Redis.connect("cache").sendCommand('EXPIRE', [args.join(':'), 604800]);

      return value;
    });
  }

  increment(value, ...args) {
    let promises = [];
    value *= 1;

    return new Promise((resolve, reject) => {
      this.get(...args).then(async (currValue) => {

        if (currValue + value >= 0) {
          let newValue = currValue + value;

          switch (args[0]) {
            case 'species':
              if (newValue < 2) {
                let bird = Birds.findBy('speciesCode', args[2]);

                for (let adjective of bird.adjectives) {
                  promises.push(this.increment(newValue == 1 ? 1 : -1, 'eggs', args[1], adjective));
                }
              }
              break;
          }

          promises.push(Redis.connect('cache').sendCommand('INCRBY', [args.join(':'), value]));
          promises.push(Redis.connect("cache").sendCommand('EXPIRE', [args.join(':'), 604800]));

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
