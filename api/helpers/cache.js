const Database = require('./database.js');
const Redis = require('./redis.js');

class Cache {
  dataTypes = {
    aviary: "z",
    bird: "h",
    cache: "s",
    flocks: "s",
    illustration: "h",
    illustrations: "s",
    member: "h",
    wishlist: "h",
    birdypet: "h",
    flock: "h",
    aviaryTotals: "h",
    flockTotals: "h"
  }

  get(kind, id) {
    if (!id) {
      return null;
    }

    return new Promise((resolve, reject) => {
      let action = null;

      switch (this.dataTypes[kind]) {
        case "h":
          action = "hgetall";
          break;
        case "z":
          action = "smembers";
          break;
        case "s":
          action = "zcount";
          break;
      }

      Redis.connect()[action](`${kind}:${id}`, (err, results) => {
        if (err || !results) {
          resolve(this.refresh(kind, id));
        } else {
          resolve(results);
        }
      });
    });
  }

  add(kind, id, data) {
    return new Promise((resolve, reject) => {
      this.get(kind, id).then((results) => {
        Redis.connect().sadd(`${kind}:${id}`, data, (err, results) => {
          resolve(results);
        });
      });
    });
  }

  remove(kind, id, data) {
    return new Promise((resolve, reject) => {
      this.get(kind, id).then((results) => {
        Redis.connect().srem(`${kind}:${id}`, data, (err, results) => {
          resolve(results);
        });
      });
    });
  }

  refresh(kind = 'cache', id) {
    var expiration = 604800 // 1 week;

    return new Promise(async (resolve, reject) => {
      var data = {};
      var filters = [];

      switch (kind) {
        case 'aviary':
          await Database.fetch({
            kind: kind,
            filters: [
              ['member', '=', id]
            ],
            order: ['hatchedAt', 'ASC']
          }).then((results) => resolve(results.map((result) => [result.hatchedAt, result[Database.KEY].name])));
          break;
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
          } else if (id == "freebirds") {
            Redis.scan('freebird').then((freebirds) => {
              resolve(freebirds);
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
      await Redis.connect().del(`${kind}:${id}`);

      if (results && results[Database.KEY]) {
        delete results[Database.KEY];
      }

      switch (this.dataTypes[kind]) {
        case "h":
          for (let key in results) {
            let data = results[key];

            switch (typeof data) {
              case "object":
              case "array":
                results[key] = JSON.stringify(data);
			    break;
            }

            await Redis.connect().hset(`${kind}:${id}`, key, results[key]);
          }
          break;
        case "s":
          if (results.length > 0) {
            await Redis.connect().sadd(`${kind}:${id}`, results);
          }
          break;
        case "z":
          for (let i = 0, len = results.length; i < len; i++) {
            await Redis.connect().zadd(`${kind}:${id}`, ...results[i]);
          }
          break;
        default:
          return results;
      }

      await Redis.connect().sendCommand('EXPIRE', [`${kind}:${id}`, expiration]);

      return results;
    });
  }
}

module.exports = new Cache;
