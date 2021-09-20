const {
    Datastore
} = require('@google-cloud/datastore');

const DB = new Datastore({
    namespace: 'squawkoverflow'
});

const secrets = require('../secrets.json');

DB.runQuery(DB.createQuery('Photo')).then( async ([photos]) => {
	var flocks = {};
	var members = {};

	photos.forEach( (photo) => {
		photo.flocks.forEach( (flock) => {
			if (!flocks[flock]) {
				flocks[flock] = 0;
			}

			flocks[flock]++;
		});

		if (photo.submittedBy) {
		if (!members[photo.submittedBy]) {
			members[photo.submittedBy] = 0;
		}

		members[photo.submittedBy]++;
		}
		else {
			console.log(photo.source);
		}
	});

	for (let flock in flocks) {
		await DB.runQuery(DB.createQuery('Flock').filter('name', '=', flock)).then( async ([flockData]) => {
			if (flockData[0]) {
			  flockData[0].photoCount = flocks[flock];

			  await DB.save(flockData[0]);
			}
		});
	}

	for (let member in members) {
		await DB.get(DB.key(['Member', member])).then( async ([memberData]) => {
			if (memberData) {
				memberData.photoCount = members[member];

				await DB.save(memberData);
			}
		});
	}
});
