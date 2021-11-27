let endpoint = require('./endpoints/members.js');

endpoint({
  method: "GET",
  query: {
	  privacy: "gifts"
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
