const Birds = require('../../helpers/birds.js');
const Database = require('../../helpers/database.js');
const Redis = require('../../helpers/redis.js');

Database.fetch({
	kind: 'Member'
}).then( async (response) => {
	for (var member of response) {
		console.log(member);
		await Redis.get('wishlist', member[Database.KEY].name).then( async (results) => {
			let data = {};
			
			for (let speciesCode of results) {
				let bird = Birds.findBy('speciesCode', speciesCode);

				if (!data[bird.family]) {
					data[bird.family] = [];
				}

				data[bird.family].push(speciesCode);
			}

			await Database.save('Wishlist', member[Database.KEY].name, data);
		});
	}

	process.exit(0);
});
