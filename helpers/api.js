const {
  GoogleAuth
} = require('google-auth-library');

const auth = new GoogleAuth();

exports.call = (endpoint, method = "GET", data = {}, res) => {
  return new Promise(async (resolve, reject) => {
    const apiPath = 'https://us-central1-bot-central.cloudfunctions.net/api';
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
  });
}
