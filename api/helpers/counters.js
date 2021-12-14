const Database = require('./database.js');
const Redis = require('./redis.js');
const Search = require('./search.js');

const Birds = require('../collections/birds.js');

class Counters {
  get(kind, member, id) {
    return new Promise((resolve, reject) => {
      Redis.connect('cache').get(`${kind}:${member}:${id}`, (err, value) => {
        if (err || value == null || typeof value == "undefined") {
          resolve(this.refresh(`${kind}:${member}:${id}`));
        } else {
          resolve(value * 1);
        }
      });
    });
  }

  refresh(kind, member, id) {
    return new Promise(async (resolve, reject) => {
      let promises = [];

      switch (kind) {
        case 'eggs':
          let eggs = require('../data/eggs.json');
          let value = 0;
          let start = 0;
          let end = eggs[id].species.length;

          do {
            promises = [];

            for (let i = start, len = Math.min(end, start + 250); i < len; i++, start++) {
              promises.push(this.get('species', member, eggs[id].species[i]));
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
              ['member', '=', member],
              ['speciesCode', '=', id]
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
              ['member', '=', member],
              ['illustration', '=', id]
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
      Redis.connect('cache').set(`${kind}:${member}:${id}`, value);
      Redis.connect('cache').sendCommand('EXPIRE', [`${kind}:${member}${id}`, 604800]);

      return value;
    });
  }

  increment(value, kind, member, id, cascade = false) {
    value *= 1;

    return new Promise((resolve, reject) => {
      this.get(kind, member, id).then(async (currValue) => {
        if (currValue + value >= 0) {
          let newValue = currValue + value;
          let promises = [];

          Redis.connect('cache').sendCommand('INCRBY', [`${kind}:${member}:${id}`, value]);
          Redis.connect("cache").sendCommand('EXPIRE', [`${kind}:${member}:${id}`, 604800]);

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
