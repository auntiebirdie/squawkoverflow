let endpoint = require('./endpoints/member.js');

endpoint({
  method: "PUT",
  body: {
      loggedInUser: '121294882861088771',
	  settings: {
		  privacy: "activity"
	  }
  }
}, {
  json: (input) => input,
  sendStatus: console.log,
	status: (code) => {
		console.log(code);

		return {
			json: console.log
		};
	}
}).then((output) => {

  console.log(output);

  process.exit(0);
});
