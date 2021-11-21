let endpoint = require('./endpoints/collect.js');

endpoint({
  method: "POST",
  body: {
      birdypet: 'a2oKqKui3HXyrsVgoPA4xk',
      freebird: 'BhYsXUZIUTcZCGhRDk9eIz81IChFEgAKTwIoXXk3VDZBXXAOPg0Zcn1hdG0OElcGRFZ-C1oRDGxWXGc2URX1gpTdQ0h6EAIKR1t2Wl8YD2pcVX0GVyWzodLK7sSSJhs-fb-OtuctLcHPick2Zi09XhJLLD5-Lz5FQV5AEkwkC0RJUytDCypYEU4EISE-MD5FU0RQ',
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
