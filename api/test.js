const endpoint = require('./endpoints/bird.js');

endpoint({
	method: 'GET',
	query: {
		speciesCode: 'abbbab1',
		include: ['members']
	}
}, {
	json: console.log
});
