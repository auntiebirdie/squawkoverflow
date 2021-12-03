const endpoint = require('./endpoints/collect.js');

endpoint({
	method: 'POST',
	headers: [],
	body: {"egg":"outer","loggedInUser":"121294882861088771"}
}, {
	send: console.log,
	json: console.log,
	sendStatus: console.log,
	status: function (code) {
		console.log(code);

		return this;
	}
});
