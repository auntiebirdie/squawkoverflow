let endpoint = require('./endpoints/eggs.js');

endpoint({
  method: "GET",
  query: {
	  loggedInUser: '121294882861088771'
  }
}, {
  json: console.log,
  sendStatus: console.log,
  status: (code) => {
    console.log(code);

    return {
      json: console.log
    };
  }
}).then(() => process.exit(0));
