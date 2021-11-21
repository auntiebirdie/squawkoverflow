const Birds = require('../../helpers/birds.js');
const Database = require('../../helpers/database.js');
const Redis = require('../../helpers/redis.js');

Redis.scan('memberpet').then( async (results) => {
	var started = false;

	for (var result of results) {
		if (result._id == "vS5rCuWHof5H78iibzrB7h") {
			started = true;
		}

		if (started) {
		console.log(`Saving ${result._id}`);
		await Database.save('MemberPet', result._id, {
			birdypetId: result.birdypetId,
			member: result.member,
			nickname: result.nickname,
			description: result.description,
			flocks: result.flocks == "NONE" || !result.flocks ? [] : result.flocks.split(','),
			friendship: result.friendship
		});
		}
	}

	process.exit(0);
});
