const Database = require('./database.js');
const Redis = require('./redis.js');

class Cache {
  dataTypes = {
    aviary: "z",
    bird: "h",
    cache: "s",
    flocks: "s",
    variant: "h",
    variants: "s",
    member: "h",
    wishlist: "h",
    birdypet: "h",
    flock: "h",
    flockTotals: "h"
  }

  get(kind, id) {
    return new Promise((resolve, reject) => {
      let action = null;

      switch (this.dataTypes[kind]) {
        case "h":
          action = "hgetall";
          break;
        case "s":
          action = "smembers";
          break;
        case "z":
          action = "zcount";
          break;
      }

      Redis.connect()[action](`${kind}:${id}`, (err, results) => {
        if (err || !results || results.length == 0) {
          resolve(this.refresh(kind, id));
        } else {
          resolve(results);
        }
      });
    });
  }

  add(kind, id, data) {
    return new Promise((resolve, reject) => {
      this.get(kind, id).then(async (results) => {
        if (this.dataTypes[kind] == "z") {
          await Redis.connect().zadd(`${kind}:${id}`, data[0], data[1]);
        } else {
          await Redis.connect().sadd(`${kind}:${id}`, data);
        }

        resolve();
      });
    });
  }

  remove(kind, id, data) {
    return new Promise((resolve, reject) => {
      this.get(kind, id).then((results) => {
        Redis.connect()[this.dataTypes[kind] + 'rem'](`${kind}:${id}`, data, (err, results) => {
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
          await Database.get('birdypets', {
            member: id
          }, {
            select: ['id', 'hatchedAt']
          }).then((results) => {
            resolve(results.map((result) => [new Date(result.hatchedAt).getTime(), result.id]))
          });
          break;
        case 'bird':
          Database.get('species', {
            code: id
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
            Database.fetch({
              kind: 'FreeBird',
              keysOnly: true
            }).then((freebirds) => {
              resolve(freebirds.map((freebird) => freebird[Database.KEY].name));
            });
          }
          break;
        case 'flocks':
          Database.get('flocks', {
              member: id
            }, {
              select: ['id']
            })
            .then((flocks) => {
              resolve(flocks.map((flock) => flock.id));
            });
          break;
        case 'variant':
          Database.getOne('variants', {
            id: id
          }).then((variant) => {
            resolve(variant);
          });
          break;
        case 'variants':
          let tmp = id.split(':');
          let tmpKey = tmp[0];
          let tmpValue = tmp[1];

          if (tmpKey == 'prefix-alias') {
            filters.prefix = tmpValue.split('-').shift();
            filters.alias = tmpValue.split('-').pop();
          } else {
            filters[tmpKey] = tmpValue;
          }

          Database.get('variants', filters, {
            select: ['id']
          }).then((variants) => {
            resolve(variants.map((variant) => variant.id));
          });
          break;
        case 'wishlist':
          Database.get('wishlist', {
            member: id
          }).then((results) => {
            resolve(results.filter((result) => result.intensity > 0).map((result) => result.species));
          });
          break;
        case 'birdypet':
          Database.get('birdypets', {
            id: id
          }).then(([birdypet]) => {
            resolve(birdypet);
          });
          break;
        case 'flock':
          Database.getOne('flocks', {
            id: id
          }).then((flock) => {
            resolve(flock);
          });
          break;
        default:
          reject(`Unknown cache type ${kind}`);
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

          results = results.map((result) => result[1]);
          break;
        default:
          return results;
      }

      if (expiration > 0) {
        await Redis.connect().sendCommand('EXPIRE', [`${kind}:${id}`, expiration]);
      }

      return results;
    });
  }
}

module.exports = new Cache;
