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
          Database.count('birdypets', {
            member: member
          }).then((results) => {
            resolve(results * 1);
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
          Database.query(`
	    SELECT COUNT(DISTINCT variants.species) total
	    FROM birdypets
	    JOIN variants ON (birdypets.variant = variants.id)
	    JOIN species ON (variants.species = species.code)
	    WHERE birdypets.member = ? AND species.family = ?
	  `, [member, id])
            .then((results) => {
              resolve(results[0].total);
            });

          break;
        case 'species':
          Database.query(`
            SELECT COUNT(*) total
            FROM birdypets
            JOIN variants ON (birdypets.variant = variants.id)
            WHERE birdypets.member = ? AND variants.species = ?
          `, [member, id])
            .then((results) => {
              resolve(results[0].total);
            });
          break;
        case 'birdypets':
          Database.count('birdypets', {
            member: member,
            variant: id
          }).then((results) => {
            resolve(results * 1);
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

    return new Promise(async (resolve, reject) => {
      this.get(kind, member, id).then(async (currValue) => {
        let promises = [];

        if (updateEggs) {
          if (currValue < 2) {
            const Bird = require('../models/bird.js');
            let bird = new Bird(id);

            await bird.fetch({
              include: ['adjectives']
            })

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
                const Variant = require('../models/variant.js');
                let variant = new Variant(id);

                await variant.fetch();

                promises.push(this.increment(newValue == 0 ? -1 : 1, 'species', member, variant.bird.code));
                break;
              case 'species':
                const Bird = require('../models/bird.js');
                let bird = new Bird(id);

			    await bird.fetch();

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
