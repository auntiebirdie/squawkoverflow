const secrets = require('../secrets.json');
const uuid = require('short-uuid');
const Redis = require("redis");

function Database() {
  let databases = {
    "MEMBERPETS": ["memberpet", "flock"],
    "MEMBERS": ["member", "wishlist"],
    "FREEBIRDS": ["freebird"]
  };

  this.databases = {};
  this.dataTypes = {
    "memberpet": "h",
    "flock": "h",
    "member": "h",
    "wishlist": "s",
    "freebird": "h"
  };

  for (let DB in databases) {
    let conn = Redis.createClient(secrets.REDIS[DB].PORT, secrets.REDIS[DB].HOST);
    conn.auth(secrets.REDIS[DB].AUTH);

    for (let database of databases[DB]) {
      this.databases[database] = conn;
    }
  }
}

Database.prototype.get = function(kind, id, field = "") {
  return new Promise((resolve, reject) => {
    switch (this.dataTypes[kind]) {
      case "h":
        if (field != "") {
          this.databases[kind].hget(`${kind}:${id}`, field, (err, result) => {
            resolve(result);
          });
        } else {
          this.databases[kind].hgetall(`${kind}:${id}`, (err, result) => {
            if (err) {
              return resolve();
            }

            resolve({
              ...result,
              ...{
                _id: id
              }
            });
          });
        }
        break;
      case "s":
        this.databases[kind].smembers(`${kind}:${id}`, (err, result) => {
          resolve(result);
        });
        break;
    }
  });
}

Database.prototype.set = function(kind, id, data) {
  return new Promise(async (resolve, reject) => {
    for (var datum in data) {
      if (data[datum] !== null && data[datum] !== undefined) {
        await this.databases[kind].hset(`${kind}:${id}`, datum, data[datum]);
      } else {
        await this.databases[kind].hdel(`${kind}:${id}`, datum);
      }
    }

    resolve();
  });
}

Database.prototype.increment = function(kind, id, field, value) {
  return new Promise(async (resolve, reject) => {
    await this.databases[kind].sendCommand('HINCRBY', [`${kind}:${id}`, field, value]);

    resolve();
  });
}

Database.prototype.push = function(kind, id, value) {
  return new Promise(async (resolve, reject) => {
    await this.databases[kind].sadd(`${kind}:${id}`, value);

    resolve();
  });
}

Database.prototype.pop = function(kind, id, value) {
  return new Promise(async (resolve, reject) => {
    await this.databases[kind].srem(`${kind}:${id}`, value);
    resolve();
  });
}

Database.prototype.fetch = function({
  kind,
  filters,
  order,
  limit,
  startAt,
  keysOnly
}) {
  return new Promise(async (resolve, reject) => {
    let query = [kind];
    var output = [];

    if (filters) {
      var filterString = "";
      for (filter of filters) {
        filterString += `@${filter.field}:{${filter.value}} `;
      }

      query.push(filterString);

      query.push('LIMIT');

      if (limit) {
        query.push(limit[0], limit[1]);
      } else {
        query.push(0, 5000);
      }

      this.databases[kind].sendCommand('FT.SEARCH', query, function(err, response) {
        if (response) {

          for (var i = 1, len = response.length; i < len; i++) {
            var id = response[i];
            var rawData = response[++i];
            var data = {
              _id: id.split(":").pop()
            };

            for (var l = 0, llen = rawData.length; l < llen; l++) {
              data[rawData[l]] = rawData[++l];
            }

            output.push(data);
          }
        }

        resolve(output);
      });
    } else {
      var noResultsLeft = false;
      var cursor = startAt || 0;

      do {
        await new Promise((resolve, reject) => {
          this.databases[kind].scan(cursor, 'MATCH', `${kind}:*`, async (err, response) => {
            if (err) {
              console.log(err);
              noResultsLeft = true;
            } else {
              if (response[0] == 0) {
                noResultsLeft = true;
              } else {
                cursor = response[0];
              }

              var results = response[1];

              for (var i = 0, len = results.length; i < len; i++) {
                if (!limit || output.length < limit) {
                  await this.get(kind, results[i].split(':').pop()).then((data) => {
                    output.push(data);
                  });
                }
              }
            }

            resolve();
          });
        });
      }
      while (!noResultsLeft && (!limit || output.length < limit));

      resolve(output);
    }
  }).then((output) => {
    if (order) {
      return output.sort((a, b) => {
        try {
          if (order.dir == "desc") {
            return b[order.field].localeCompare(a[order.field]);
          } else {
            return a[order.field].localeCompare(b[order.field]);
          }
        } catch (err) {
          return 0;
        }
      });
    } else {
      return output;
    }
  });
}

Database.prototype.fetchOne = function(args) {
  return new Promise((resolve, reject) => {
    this.fetch({
      ...args,
      "limit": [0, 1]
    }).then((results) => {
      resolve(results[0] || null);
    });
  });
}

Database.prototype.create = function(kind, data, uniqueField = false) {
  return new Promise((resolve, reject) => {
    if (uniqueField) {
      this.fetchOne({
        "kind": kind,
        "filters": [{
          field: uniqueField,
          value: data[uniqueField]
        }]
      }).then((result) => {
        if (result) {
          reject(result._id);
        } else {
          resolve(this.create(kind, data));
        }
      });
    } else {
      resolve(this.save(kind, null, data));
    }
  });
}

Database.prototype.save = function(kind, id, data) {
  return new Promise((resolve, reject) => {
    if (!id) {
      id = uuid.generate();
    }

    this.set(kind, id, data).then( () => {
      resolve(id);
    });
  });
}

Database.prototype.delete = function(kind, id) {
  return new Promise(async (resolve, reject) => {
    await this.databases[kind].del(`${kind}:${id}`);

    return resolve();
  });
}

module.exports = new Database();
