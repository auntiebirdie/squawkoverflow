let endpoint = require('./endpoints/login.js');

endpoint({
  method: "POST",
  body: { "konami" : "5690982938968064" }
//	query: {"page":"1","sort":"[\"hatchedAt\",\"DESC\"]","family":"","flock":"t4MVaJVuFvck2wZbPHMmBg","search":"","member":"121294882861088771","loggedInUser":"121294882861088771"}
  //body: {"name":"test","description":"this is a test","member":"121294882861088771","loggedInUser":"121294882861088771"}
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
