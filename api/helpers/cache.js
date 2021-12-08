const Database = require('./database.js');
const Redis = require('./redis.js');

class Cache {
  get(kind, id, type = "h") {
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

  add(kind, id, data) {
    return new Promise((resolve, reject) => {
      this.get(kind, id, "s").then((results) => {
        Redis.connect('cache').sadd(`${kind}:${id}`, data, (err, results) => {
          resolve(results);
        });
      });
    });
  }

  refresh(kind = 'cache', id, type) {
    var expiration = 604800 // 1 week;

    return new Promise(async (resolve, reject) => {
      var data = {};
      var filters = [];

      switch (kind) {
        case 'bird':
          Database.fetch({
            kind: 'Bird',
            filters: [
              ['code', '=', id]
            ]
          }).then((bird) => resolve(bird[0]));
          break;
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
        case 'flocks':
          Database.fetch({
            kind: 'Flock',
            filters: [
              ['member', '=', id]
            ],
            keysOnly: true
          }).then((flocks) => {
            resolve(flocks.map((flock) => flock[Database.KEY].name));
          });
          break;
        case 'illustration':
          Database.get('Illustration', id).then((illustration) => {
            resolve(illustration);
          });
          break;
        case 'illustrations':
          let tmp = id.split(':');
          let tmpKey = tmp[0];
          let tmpValue = tmp[1];

          if (tmpKey == 'prefix-alias') {
            filters.push(['prefix', '=', tmpValue.split('-').shift()]);
            filters.push(['alias', '=', tmpValue.split('-').pop()]);
          } else {
            filters.push([tmpKey, '=', tmpValue]);
          }

          Database.fetch({
            kind: 'Illustration',
            filters: filters,
            keysOnly: true
          }).then((illustrations) => {
            resolve(illustrations.map((illustration) => illustration[Database.KEY].name));
          });
          break;
        case 'member':
          Database.get('Member', id).then((member) => {
            resolve(member);
          });
          break;
        case 'wishlist':
          Database.get('Wishlist', id).then((wishlist) => {
            resolve(wishlist);
          });
          break;
        case 'birdypet':
          Database.get('BirdyPet', id).then((birdypet) => {
            resolve(birdypet);
          });
          break;
        case 'flock':
          Database.get('Flock', id).then((flock) => {
            resolve(flock);
          });
          break;
        case 'aviaryTotals':
        case 'flockTotals':
          if (kind == 'aviaryTotals') {
            filters.push(['member', '=', id]);
          } else if (kind == 'flockTotals') {
            if (id.startsWith('NONE-')) {
              let tmp = id.split('-');

              filters.push(['member', '=', tmp[1]]);
              filters.push(['flocks', '=', 'NONE']);
            } else {
              filters.push(['flocks', '=', id]);
            }
          }

          Database.fetch({
            kind: 'BirdyPet',
            filters: filters
          }).then((birdypets) => {
            data._total = 0;

            for (var birdypet of birdypets) {
              if (!data[birdypet.family]) {
                data[birdypet.family] = 0;
              }

              data._total++;
              data[birdypet.family]++;
            }

            resolve(data);
          });
          break;
        default:
          reject('Unknown cache type');
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
}

module.exports = new Cache;
