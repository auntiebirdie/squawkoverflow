let endpoint = require('./endpoints/collect.js');

endpoint({
  method: "POST",
  body: {
	  "freebird" : "oKoinKEyXb6EFdHGRPxTW7",
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
