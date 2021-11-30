const secrets = require('../secrets.json');
const uuid = require('short-uuid');
const Redis = require("redis");

function Database() {
  this.databases = {
    "memberpet": "MEMBERPETS",
    "flock": "MEMBERPETS",
    "cache": "CACHE",
    "member": "CACHE",
    "freebird": "FREEBIRDS"
  };

  this.dataTypes = {
    "memberpet": "h",
    "flock": "h",
    "member": "h",
    "cache": "s",
    "freebird": "kv"
  };

  this.connections = {};
}

Database.prototype.connect = function(database) {
  let DB = this.databases[database];

  if (!this.connections[DB]) {
    this.connections[DB] = Redis.createClient(secrets.REDIS[DB].PORT, secrets.REDIS[DB].HOST);
    this.connections[DB].auth(secrets.REDIS[DB].AUTH);
  }

  return this.connections[DB];
}

Database.prototype.escape = function(text) {
  return text.trim().replace(/\'s/g, "").replace(/\-/g, " ").replace(/\s/g, "* ") + "*";
}

Database.prototype.get = function(kind, id, field = "") {
  return new Promise((resolve, reject) => {
    switch (this.dataTypes[kind]) {
      case "s":
        this.connect(kind).smembers(`${kind}:${id}`, (err, result) => {
          resolve(result);
        });
        break;
      case "kv":
        this.connect(kind).get(`${kind}:${id}`, (err, result) => {
          resolve(result);
        });
        break;
      default:
        if (field != "") {
          this.connect(kind).hget(`${kind}:${id}`, field, (err, result) => {
            resolve(result);
          });
        } else {
          this.connect(kind).hgetall(`${kind}:${id}`, (err, result) => {
            if (err || !result) {
              return resolve();
            }

            resolve(result);
          });
        }
    }
  });
}

Database.prototype.set = function(kind, id, data) {
  return new Promise(async (resolve, reject) => {
    switch (this.dataTypes[kind]) {
      case "kv":
        await new Promise((resolve, reject) => {
          this.connect(kind).set(`${kind}:${id}`, data, resolve);
        });
        break;
      default:
        for (var datum in data) {
          await new Promise((resolve, reject) => {
            if (data[datum] !== null && data[datum] !== undefined) {
              this.connect(kind).hset(`${kind}:${id}`, datum, data[datum], resolve);
            } else {
              this.connect(kind).hdel(`${kind}:${id}`, datum, resolve);
            }
          });
        }
    }

    resolve();
  });
}

Database.prototype.increment = function(kind, id, field, value) {
  return new Promise(async (resolve, reject) => {
    await this.connect(kind).sendCommand('HINCRBY', [`${kind}:${id}`, field, value]);

    resolve();
  });
}

Database.prototype.push = function(kind, id, value) {
  return new Promise(async (resolve, reject) => {
    await this.connect(kind).sadd(`${kind}:${id}`, value);

    resolve();
  });
}

Database.prototype.pop = function(kind, id, value) {
  return new Promise(async (resolve, reject) => {
    await this.connect(kind).srem(`${kind}:${id}`, value);
    resolve();
  });
}

Database.prototype.sendCommand = function(kind, command, args) {
  return new Promise(async (resolve, reject) => {
    this.connect(kind).sendCommand(command, args, function(err, response) {
      if (err) {
        console.error(err);
      }
      resolve(response);
    });
  });
}

Database.prototype.fetch = function(kind, args = {}) {
  return new Promise(async (resolve, reject) => {
    var output = {
      count: 0,
      results: []
    };
    var query = [kind];

    if (args.FILTER) {
      query.push(args.FILTER);
    } else {
      query.push('*');
    }

    if (args.RETURN) {
      query.push('RETURN', args.RETURN.length, ...args.RETURN);
    }

    if (args.SORTBY) {
      query.push('SORTBY', ...args.SORTBY);
    }

    if (args.COUNT) {
      query.push('LIMIT', 0, 0);
    } else {
      if (args.LIMIT) {
        query.push('LIMIT', ...args.LIMIT);
      } else {
        query.push('LIMIT', 0, 10);
      }
    }

    var noResultsLeft = false;

    do {
      await new Promise((resolve, reject) => {
        this.connect(kind).sendCommand('FT.SEARCH', query, function(err, response) {
          if (err) {
            console.error(err);
            noResultsLeft = true;
          } else {
            output.count = response[0];

            if (args.COUNT) {
              noResultsLeft = true;
            } else {
              for (var i = 1, len = response.length; i < len; i++) {
                var id = response[i];
                var rawData = response[++i];
                var data = {
                  _id: id.split(":").pop()
                };

                for (var l = 0, llen = rawData.length; l < llen; l++) {
                  data[rawData[l]] = rawData[++l];
                }

                output.results.push(data);
              }

              if (args.LIMIT || output.results.length >= response[0] || response.length <= 1) {
                noResultsLeft = true;
              } else {
                query[query.length - 2] = output.results.length;
              }
            }
          }

          resolve();
        });
      });
    }
    while (!noResultsLeft);

    resolve(output);
  });
}

Database.prototype.fetchOne = function(kind, args) {
  return new Promise((resolve, reject) => {
    this.fetch(kind, {
      ...args,
      "LIMIT": [0, 1]
    }).then((results) => {
      resolve(results[0] || null);
    });
  });
}

Database.prototype.scan = async function(kind, args = {}) {
  return new Promise(async (resolve, reject) => {
    var noResultsLeft = false;
    var cursor = args.CURSOR || 0;
    var output = [];

    do {
      await new Promise((resolve, reject) => {
        this.connect(kind).scan(cursor, 'MATCH', `${kind}:*`, async (err, response) => {
          if (err) {
            console.error(err);
            noResultsLeft = true;
          } else {
            if (response[0] == 0) {
              noResultsLeft = true;
            } else {
              cursor = response[0];
            }

            var results = response[1];

            for (var i = 0, len = results.length; i < len; i++) {
              if (!args.LIMIT || output.length < args.LIMIT) {
                var key = results[i].split(':').pop();

                if (args.KEYSONLY) {
                  output.push(key);
                } else {
                  await this.get(kind, key).then((data) => {
                    output.push(data);
                  });
                }
              }
            }
          }

          resolve();
        });
      });
    }
    while (!noResultsLeft && (!args.LIMIT || output.length < args.LIMIT));

    resolve(output);
  }).then((output) => {
    if (args.SORTBY) {
      output.sort((a, b) => {
        try {
          if (args.SORTBY[1] == "DESC") {
            return b[args.SORTBY[0]].localeCompare(a[args.SORTBY[0]]);
          } else {
            return a[args.SORTBY[0]].localeCompare(b[args.SORTBY[0]]);
          }
        } catch (err) {
          return 0;
        }
      });
    }

    return output;
  });
}

Database.prototype.create = function(kind, data, uniqueField = false) {
  return new Promise((resolve, reject) => {
    if (uniqueField) {
      this.fetchOne(kind, {
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

    this.set(kind, id, data).then(() => {
      resolve(id);
    }).catch((err) => {
      console.error(err);
    });
  });
}

Database.prototype.delete = function(kind, id) {
  return new Promise(async (resolve, reject) => {
    await this.connect(kind).del(`${kind}:${id}`);

    return resolve();
  });
}

module.exports = new Database();
