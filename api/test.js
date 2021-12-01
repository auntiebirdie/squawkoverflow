let endpoint = require('./endpoints/collect.js');

endpoint({
  method: "POST",
	body: {"loggedInUser":"121294882861088771","birdypet":"8LtjQNpVxz83FWy6uEwQpX","adjective":"precious"}
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
