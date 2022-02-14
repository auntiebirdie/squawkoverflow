exports.call = (endpoint, method = "GET", data = {}, headers = {}) => {
  return new Promise(async (resolve, reject) => {
    if (process.env.DEV) {
      let req = {
        method: method,
        path: endpoint
      };

      for (let key in data) {
        data[key] = JSON.stringify(data[key]);
      }

      if (method == 'GET' || method == 'HEAD') {
        req.query = data;
      } else {
        req.body = data;
      }

      let res = {
        sendStatus: function(code) {
          if (code != 200) {
            reject({
              code: code,
              response: {}
            });
          } else {
            resolve(code);
          }
        },
        setHeader: function(header, value) {
          resolve(value);
        },
        json: function(data) {
          if (this.code && this.code != 200) {
            reject({
              code: this.code,
              response: {
                data: data
              }
            });
          } else {
            resolve(data);
          }
        },
        status: function(code) {
          this.code = code;

          return this;
        }
      };

      require('../api/index.js').api(req, res);
    } else {
      const {
        GoogleAuth
      } = require('google-auth-library');

      const auth = new GoogleAuth();

      const apiPath = 'https://us-central1-squawkoverflow.cloudfunctions.net/api';
      const client = await auth.getIdTokenClient(apiPath);
      const url = `${apiPath}/${endpoint}`;

      const allowedHeaders = ['x-patreon-signature', 'x-patreon-event'];

      const options = {
        url,
        method: method,
        headers: Object.fromEntries(Object.entries(headers).filter(([key]) => allowedHeaders.includes(key)))
      };

      for (let key in data) {
        data[key] = JSON.stringify(data[key]);
      }

      if (method == "GET" || method == "HEAD") {
        options.params = data;
      } else {
        options.data = data;
      }

      client.request(options).then((response) => {
        if (method == "HEAD") {
          resolve(response.headers.squawk ? JSON.parse(response.headers.squawk) : null);
        } else {
          resolve(response.data);
        }
      }).catch((err) => {
        reject(err);
      });
    }
  });
}