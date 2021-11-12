const secrets = require('../secrets.json');
const Redis = require('./redis.js');

const eggs = require('../public/data/eggs.json');

function Cache() {}

Cache.prototype.get = function(kind, id, type = "h") {
  return new Promise((resolve, reject) => {
    Redis.databases["cache"][type == "h" ? "hgetall" : "smembers"](`${kind}:${id}`, (err, result) => {
      resolve(result);
    });
  }).then((results) => {
    return new Promise((resolve, reject) => {
      if (typeof results == 'undefined' || results == null) {
        resolve(this.refresh(kind, id, type));
      } else {
        resolve(results);
      }
    });
  });
}

Cache.prototype.refresh = function(kind = 'cache', id, type) {
  return new Promise(async (resolve, reject) => {
    var data = type == "h" ? {} : [];

    switch (kind) {
      case 'aviaryTotals':
      case 'flockTotals':
        var filters = {
          'RETURN': ['family']
        };

        if (kind == 'aviaryTotals') {
          filters = {
            'FILTER': `@member:{${id}}`
          };
        } else if (kind == 'flockTotals') {
          if (id.startsWith('NONE-')) {
            let tmp = id.split('-');

            filters = {
              'FILTER': `@member:{${tmp[1]}} @flocks:{NONE}`
            };
          } else {
            filters = {
              'FILTER': `@flocks:{${id}}`
            };
          }
        }

        Redis.fetch('memberpet', filters).then((response) => {
          data._total = 0;

          for (var memberpet of response.results) {
            if (!data[memberpet.family]) {
              data[memberpet.family] = 0;
            }

            data._total++;
            data[memberpet.family]++;
          }

          resolve(data);
        });
        break;
      case 'eggTotals':
        Redis.fetch('memberpet', {
          'FILTER': `@member:{${id}}`,
          'RETURN': ['birdypetSpecies']
        }).then((response) => {
          for (var egg in eggs) {
            let tmp = eggs[egg].species;

            if (tmp) {
              data[egg] = response.results.filter((memberpet) => tmp.includes(memberpet.birdypetSpecies)).length;
            }
          }

          resolve(data);
        });
        break;
      default:
        if (kind.startsWith('species-')) {
          let speciesCode = kind.split('-')[1];

          Redis.fetch('memberpet', {
            'FILTER': `@member:{${id}} @birdypetSpecies:{${speciesCode}}`,
            'RETURN': [`birdypetId`]
          }).then(async (response) => {
            for (var memberpet of response.results) {
              data.push(memberpet.birdypetId);
            }

            resolve(data);
          });
        } else if (kind.startsWith('eggs-')) {
          let egg = kind.split('-')[1];
          let species = eggs[egg].species;


          for (let speciesCode of species) {
            let tmp = await this.get(`species-${speciesCode}`, id, "s");

            if (tmp.length > 0) {
              data.push(speciesCode);
            }
          }

          resolve(data);
        }
    }
  }).then(async (results) => {
    await Redis.databases["cache"].del(`${kind}:${id}`);

    switch (type) {
      case "h":
        for (let key in results) {
          await Redis.databases["cache"].hset(`${kind}:${id}`, key, results[key]);
        }
        break;
      case "s":
        if (results.length > 0) {
          await Redis.databases["cache"].sadd(`${kind}:${id}`, results);
        }
        break;
    }

    await Redis.databases["cache"].sendCommand('EXPIRE', [`${kind}:${id}`, 86400]);

    return results;
  });
}

module.exports = new Cache();
