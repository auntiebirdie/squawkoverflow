let endpoint = require('./endpoints/gift.js');

endpoint({
  method: "POST",
  body: {
	  member: '121294882861088771',
	  memberpet: 'gye6o2tymuorzocrNxAomf',
      loggedInUser: '121294882861088771'
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
