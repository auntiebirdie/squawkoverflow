let endpoint = require('./endpoints/memberpet.js');

endpoint({
  method: "GET",
  query: {
	  id: "wTqoBzydHsBmYUKoEaExFu",
	  loggedInUser: "121294882861088771",
	  member: "121294882861088771",
	  fetch: ['memberData', 'variants']
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
