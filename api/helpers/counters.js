const Database = require('./database.js');
const Redis = require('./redis.js');
const Search = require('./search.js');

class Counters {
  get(kind, member, id) {
    return new Promise((resolve, reject) => {
      Redis.connect('cache').get(`${kind}:${member}:${id}`, (err, value) => {
        if (err || value == null || typeof value == "undefined") {
          resolve(this.refresh(kind, member, id));
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
        case 'aviary':
          Database.fetch({
            kind: 'BirdyPet',
            filters: [
              ['member', '=', member]
            ],
            keysOnly: true
          }).then((response) => {
            resolve(response.length * 1);
          });
          break;
        case 'eggs':
          var value = 0;

          let eggs = require('../data/eggs.json');
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
        case 'family':
          var value = 0;

          Database.fetch({
            kind: 'BirdyPet',
            filters: [
              ['member', '=', member],
              ['family', '=', id]
            ]
          }).then((results) => {
            let species = {};

            for (let result of results) {
              if (!species[result.speciesCode]) {
                species[result.speciesCode] = true;

                value++;
              }
            }

            resolve(value);
          });

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

  increment(value, kind, member, id, updateEggs = false) {
    value *= 1;

    return new Promise((resolve, reject) => {
      this.get(kind, member, id).then(async (currValue) => {
        let promises = [];

        if (updateEggs) {
          if (currValue < 2) {
            const Birds = require('../collections/birds.js');
            let bird = Birds.findBy('speciesCode', id);

            for (let adjective of bird.adjectives) {
              promises.push(this.increment(currValue == 0 ? -1 : 1, 'eggs', member, adjective));
            }

            Promise.all(promises).then(() => {
              resolve(currValue);
            });
          }
        } else if (currValue + value >= 0) {
          let newValue = currValue + value;

          if (newValue < 2) {
            switch (kind) {
              case 'birdypets':
                const Illustration = require('../models/illustration.js');
                let illustration = new Illustration(id);

                await illustration.fetch();

                promises.push(this.increment(newValue == 0 ? -1 : 1, 'species', member, illustration.bird.code));
                break;
              case 'species':
                const Birds = require('../collections/birds.js');
                let bird = Birds.findBy('speciesCode', id);

                promises.push(this.increment(newValue == 0 ? -1 : 1, 'family', member, bird.family));
                break;
            }
          }

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