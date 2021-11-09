const secrets = require('../secrets.json');
const Redis = require('./redis.js');

function Cache() {}

Cache.prototype.get = function(kind = 'cache', id) {
  return new Promise((resolve, reject) => {
    Redis.get(kind, id).then((results) => {
	    delete results.total;
	    delete results.expiresAt;

      if (!results || (results._expiresAt && results._expiresAt <= Date.now())) {
        resolve(this.refresh(kind, id));
      } else {
        resolve(results);
      }
    });
  });
}

Cache.prototype.refresh = function(kind = 'cache', id) {
  return new Promise((resolve, reject) => {
    var data = {
      _expiresAt: new Date().setDate(new Date().getDate() + 7)
    };

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
        var eggs = require('../public/data/eggs.json');

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
        resolve(data);
    }
  }).then(async (data) => {
    await Redis.save(kind, id, data);

    return data;
  });
}

module.exports = new Cache();
