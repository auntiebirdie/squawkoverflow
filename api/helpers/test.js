const Cache = require('./nucache.js');

Cache.get(['eggs', '121294882861088771', 'black']).then( (response) => {
	console.log(response);
});
