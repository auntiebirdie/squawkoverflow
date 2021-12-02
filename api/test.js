const endpoint = require('./endpoints/freebirds.js');

endpoint({
	method: 'GET',
	query: {
		loggedInUser: '121294882861088771',
		speciesCode: 'abbbab1',
		include: ['members']
	}
}, {
	json: console.log
});
