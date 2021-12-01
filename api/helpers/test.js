let Counters = require('./counters.js');

(async () => {
	if (process.argv[2]) {
  let counter = await Counters.increment(process.argv[2], 'species', '121294882861088771', 'abbbab1');

	console.log(counter);
	}

	process.exit(0);
})();
