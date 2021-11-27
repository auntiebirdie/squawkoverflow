let endpoint = require('./endpoints/gift.js');

endpoint({
  method: "GET",
  query: {
	  member: "607651573010530314",
	  loggedInUser: "121294882861088771"
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
