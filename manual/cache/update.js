const Redis = require('../../helpers/redis.js');

Redis.scan('memberpet').then(async (memberpets) => {
	var aviaryCache = {};

	var flockCache = {};

	for (var memberpet of memberpets) {
		if (!aviaryCache[memberpet.member]) {
			aviaryCache[memberpet.member] = {
				total: 0
			};
		}

		if (!aviaryCache[memberpet.member][memberpet.family]) {
			aviaryCache[memberpet.member][memberpet.family] = 0;
		}

		aviaryCache[memberpet.member].total++;
		aviaryCache[memberpet.member][memberpet.family]++;

		let flocks = memberpet.flocks.split(',');

		for (var flock of flocks) {
			if (flock == 'NONE') {
				flock = `NONE-${memberpet.member}`;
			}

			if (!flockCache[flock]) {
				flockCache[flock] = {
					total: 0
				};
			}

			if (!flockCache[flock][memberpet.family]) {
				flockCache[flock][memberpet.family] = 0;
			}

			flockCache[flock].total++;
			flockCache[flock][memberpet.family]++;
		}
	}

	console.log(aviaryCache);
	console.log(flockCache);

	for (var member in aviaryCache) {

	}

	process.exit(0);
});
