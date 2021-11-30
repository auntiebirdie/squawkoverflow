let endpoint = require('./endpoints/freebirds.js');

endpoint({
  method: "GET",
  body: {
	  "limit" : 24,
	  "loggedInUser" : "121294882861088771"
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
