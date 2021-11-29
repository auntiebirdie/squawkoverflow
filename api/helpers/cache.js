const Database = require('./database.js');
const Redis = require('./redis.js');

const eggs = require('../data/eggs.json');

function Cache() {}

Cache.prototype.get = function(kind, id, type = "h") {
  return new Promise((resolve, reject) => {
    Redis.connect("cache")[type == "h" ? "hgetall" : "smembers"](`${kind}:${id}`, (err, results) => {
      if (err || typeof results == 'undefined' || results == null || results.length == 0) {
        resolve(this.refresh(kind, id, type));
      } else {
        resolve(results);
      }
    });
  });
}

Cache.prototype.add = function(kind, id, data) {
  return new Promise((resolve, reject) => {
    this.get(kind, id, "s").then((results) => {
      Redis.connect('cache').sadd(`${kind}:${id}`, data, (err, results) => {
        resolve(results);
      });
    });
  });
}

Cache.prototype.refresh = function(kind = 'cache', id, type) {
  var expiration = 604800 // 1 week;

  return new Promise(async (resolve, reject) => {
    var data = {};

    switch (kind) {
      case 'cache':
        if (id == 'members') {
          Database.fetch({
            kind: 'Member',
            keysOnly: true
          }).then((members) => {
            resolve(members.map((member) => member[Database.KEY].name));
          });
        }
        break;
      case 'member':
        Database.get('Member', id).then((member) => {
          resolve(member);
        });
        break;
      case 'wishlist':
        Database.get('Wishlist', id).then((wishlist) => {
          if (wishlist && wishlist._id) {
            delete wishlist._id;
          }

          resolve(wishlist);
        });
        break;
      case 'memberpet':
        Redis.get('memberpet', id).then((birdypet) => {
          resolve(birdypet);
        });
        break;
      case 'flock':
        Redis.get('flock', id).then((flock) => {
          resolve(flock);
        });
        break;
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

          data = [];

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

          data = [];

          for (let speciesCode of species) {
            let tmp = await this.get(`species-${speciesCode}`, id, "s");

            if (tmp.length > 0) {
              data.push(speciesCode);
            }
          }

          resolve(data);
        } else {
          resolve(null);
        }
    }
  }).then(async (results) => {
    await Redis.connect("cache").del(`${kind}:${id}`);

    if (results && results[Database.KEY]) {
      delete results[Database.KEY];
    }

    switch (typeof results) {
      case "object":
        for (let key in results) {
          let data = results[key];

          switch (typeof data) {
            case "object":
            case "array":
              results[key] = JSON.stringify(data);
          }

          await Redis.connect("cache").hset(`${kind}:${id}`, key, results[key]);
        }
        break;
      case "array":
        if (results.length > 0) {
          await Redis.connect("cache").sadd(`${kind}:${id}`, results);
        }
        break;
      default:
        return results;
    }

    await Redis.connect("cache").sendCommand('EXPIRE', [`${kind}:${id}`, expiration]);

    return results;
  });
}

module.exports = new Cache();