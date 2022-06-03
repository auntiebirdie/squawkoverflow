const uuid = require('short-uuid');
const mariadb = require('mariadb');
const secrets = require('../secrets.json');

function Database() {}

Database.prototype.connect = function() {
  return new Promise(async (resolve, reject) => {
    if (!this.conn) {
      this.conn = await mariadb.createConnection({
        host: secrets.DB[secrets.ENV].HOST,
        socketPath: secrets.DB[secrets.ENV].SOCKET,
        user: secrets.DB[secrets.ENV].USER,
        password: secrets.DB[secrets.ENV].PASS,
        allowPublicKeyRetrieval: true,
        bigIntAsNumber: true
      });

      this.conn.query('USE squawkdata');
    }

    resolve();
  });
}

Database.prototype.query = function(query, params = []) {
  return new Promise((resolve, reject) => {
    this.connect().then(() => {
      this.conn.query(query, params).then((results) => {
        if (query.endsWith(' LIMIT 1')) {
          resolve(results[0]);
        } else {
          delete results.meta;

          resolve(results);
        }
      });
    });
  });
}

Database.prototype.count = function(type, identifiers) {
  return new Promise((resolve, reject) => {
    this.get(type, identifiers, {
      select: ['COUNT(*) AS total']
    }).then((results) => {
      resolve(results[0]['total']);
    });
  });
}

Database.prototype.get = function(type, identifiers, options = {}) {
  return new Promise((resolve, reject) => {
    let query = `SELECT `;
    let selects = [];
    let filters = [];
    let params = [];

    if (options.select) {
      for (let s in options.select) {
        selects.push(options.select[s]);
      }
    } else {
      selects.push('*');
    }

    query += selects.join(', ') + ` FROM ${type}`;

    for (let i in identifiers) {
      if (Array.isArray(identifiers[i])) {
        filters.push(`\`${i}\` IN (?)`);
        params.push(identifiers[i]);
      } else if (typeof identifiers[i] == 'object') {
        filters.push(`\`${i}\` ${identifiers[i].comparator} ${'value_trusted' in identifiers[i] ? identifiers[i].value_trusted : '?'}`);
        if ('value' in identifiers[i]) {
          params.push(identifiers[i].value);
        }
      } else {
        filters.push(`\`${i}\` = ?`);
        params.push(identifiers[i]);
      }
    }

    if (filters.length > 0) {
      query += ' WHERE ' + filters.join(' AND ');
    }

    if (options.order) {
      query += ` ORDER BY ${options.order}`;
    }

    if (options.limit) {
      query += ` LIMIT ${options.limit}`;
    }

    this.query(query, params).then((results) => {
      if (options.limit == 1) {
        results = [results];
      }

      resolve(results);
    });
  });
}

Database.prototype.getOne = function(type, identifiers, options = {}) {
  return new Promise((resolve, reject) => {
    this.get(type, identifiers, options).then((results) => {
      resolve(results[0]);
    });
  });
}

Database.prototype.set = function(type, identifiers, data) {
  return new Promise((resolve, reject) => {
    let query = `UPDATE ${type} SET `;
    let values = [];
    let filters = [];
    let params = [];

    for (let d in data) {
      values.push(`\`${d}\` = ?`);
      params.push(data[d]);
    }

    query += values.join(', ');

    for (let i in identifiers) {
      filters.push(`\`${i}\` = ?`);
      params.push(identifiers[i]);
    }

    query += ' WHERE ' + filters.join(' AND ');

    this.query(query, params).then((results) => {
      resolve(results);
    });
  });
}

Database.prototype.key = function() {
  return uuid.generate();
}

Database.prototype.create = function(type, data) {
  return new Promise((resolve, reject) => {
    let query = `INSERT INTO ${type} (`;
    let fields = [];
    let values = [];
    let params = [];

    for (let d in data) {
      if (data[d]) {
        fields.push(`\`${d}\``);
        values.push('?');
        params.push(data[d]);
      }
    }

    query += fields.join(', ') + ') VALUES (' + values.join(', ') + ')';

    this.query(query, params).then((results) => {
      resolve(results);
    });
  });
}

Database.prototype.replace = function(type, data) {
  return new Promise((resolve, reject) => {
    let query = `REPLACE INTO ${type} (`;
    let fields = [];
    let values = [];
    let params = [];

    for (let d in data) {
      fields.push(`\`${d}\``);
      values.push('?');
      params.push(data[d]);
    }

    query += fields.join(', ') + ') VALUES (' + values.join(', ') + ')';

    this.query(query, params).then((results) => {
      resolve(results);
    });
  });
}

Database.prototype.delete = function(type, identifiers) {
  return new Promise((resolve, reject) => {
    let query = `DELETE FROM ${type} WHERE `;
    let filters = [];
    let params = [];

    for (let i in identifiers) {
      filters.push(`\`${i}\` = ?`);
      params.push(identifiers[i]);
    }

    query += filters.join(' AND ');

    this.query(query, params).then((results) => {
      resolve(results);
    });
  });
}

module.exports = new Database();