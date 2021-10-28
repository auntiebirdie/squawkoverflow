const secrets = require('../secrets.json');
const uuid = require('short-uuid');
const Redis = require("redis");

function Database() {
  let databases = {
    "MEMBERPETS": ["memberpet", "flock"],
    "MEMBERS": ["member", "wishlist"],
    "CACHE": ["cache"]
  };

  this.databases = {};
  this.dataTypes = {
    "memberpet": "h",
    "flock": "h",
    "member": "h",
    "wishlist": "s",
    "freebird": "h",
    "cache" : "s"
  };

  for (let DB in databases) {
    let conn = Redis.createClient(secrets.REDIS[DB].PORT, secrets.REDIS[DB].HOST);
    conn.auth(secrets.REDIS[DB].AUTH);

    for (let database of databases[DB]) {
      this.databases[database] = conn;
    }
  }
}

Database.prototype.escape = function (text) {
	return text.trim().replace(/\'s/g, "").replace(/\-/g, " ").replace(/\s/g, "* ") + "*";
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
            if (err || !result) {
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

Database.prototype.sendCommand = function(kind, command, args) {
  return new Promise(async (resolve, reject) => {
    this.databases[kind].sendCommand(command, args, function(err, response) {
      console.log(err, response);
      resolve(response);
    });
  });
}

Database.prototype.fetch = function(kind, args = {}) {
  return new Promise(async (resolve, reject) => {
    var output = [];
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
        this.databases[kind].sendCommand('FT.SEARCH', query, function(err, response) {
          if (err) {
            console.error(err);
            noResultsLeft = true;
          } else {
            if (args.COUNT) {
              output = response[0];
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

                output.push(data);
              }

              if (args.LIMIT || output.length >= response[0] || response.length <= 1) {
                noResultsLeft = true;
              } else {
                query[query.length - 2] = output.length;
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
