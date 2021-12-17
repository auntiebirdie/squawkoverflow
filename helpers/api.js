const {
  GoogleAuth
} = require('google-auth-library');

const auth = new GoogleAuth();

exports.call = (endpoint, method = "GET", data = {}) => {
  return new Promise(async (resolve, reject) => {
    if (process.env.DEV) {
      let req = {
        method: method
      };

      if (method == 'GET' || method == 'HEAD') {
        req.query = data;
      } else {
        req.body = data;
      }

      let res = {
        sendStatus: resolve,
        setHeader: function(header, value) {
          resolve(value);
        },
        json: resolve,
        status: function(code) {
          return this;
        }
      };

      require(`../api/endpoints/${endpoint}.js`)(req, res);
    } else {
      const apiPath = 'https://us-central1-squawkoverflow.cloudfunctions.net/api';
      const client = await auth.getIdTokenClient(apiPath);
      const url = `${apiPath}/${endpoint}`;

      const options = {
        url,
        method: method,
      };

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