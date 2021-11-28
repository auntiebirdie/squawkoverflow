let endpoint = require('./endpoints/memberpet.js');

endpoint({
  method: "GET",
  query: {
	  id: "16RP9RB4i8Ccc1KAFTVS4C",
	  fetch: ['variants']
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
