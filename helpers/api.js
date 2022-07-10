require('trace-unhandled/register');

const Logger = require('./logger.js');

exports.call = (endpoint, method = "GET", data = {}, headers = {}) => {
  return new Promise(async (resolve, reject) => {
    const allowedHeaders = ['x-patreon-signature', 'x-patreon-event'];

    const options = {
      path: endpoint,
      method: method,
      headers: Object.fromEntries(Object.entries(headers).filter(([key]) => allowedHeaders.includes(key)))
    };

    if (method == "GET" || method == "HEAD") {
      options.query = data;
    } else {
      options.body = data;
    }

    try {
      require(`../api/${endpoint}.js`)(options, {
        json: (response) => {
          resolve(response);
        },
        ok: () => {
          resolve({});
        },
        error: (code, response) => {
          reject({
            code: code,
            response: response
          });
        }
      });
    } catch (err) {
      console.log(err);
      reject(err);
    }
  });
}