exports.call = (endpoint, method = "GET", data = {}, headers = {}) => {
  return new Promise(async (resolve, reject) => {
      const {
        GoogleAuth
      } = require('google-auth-library');

      const auth = new GoogleAuth();

      const apiPath = 'https://us-central1-squawkoverflow.cloudfunctions.net/' + (process.env.NODE_ENV == "production" ? 'api' : 'test');

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
  });
}
