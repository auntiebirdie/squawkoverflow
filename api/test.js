let endpoint = require('./endpoints/collect.js');

endpoint({
  method: "POST",
	body: {"loggedInUser":"293893094456295430","birdypet":"iTXnvqq72qH9BgmAadW2sR"}
	//body: { "loggedInUser" : "121294882861088771", "egg": "black" }
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
