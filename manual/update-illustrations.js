const {
  Datastore
} = require('@google-cloud/datastore');

const {
  Storage
} = require('@google-cloud/storage');

const DB = new Datastore({
  namespace: 'squawkoverflow'
});

const storage = new Storage();
const bucket = storage.bucket('birdypets');
const uuid = require('short-uuid');

const birds = require('../helpers/birds.js');

var started = false;

DB.runQuery(DB.createQuery('Illustration')).then( async ([results]) => {
	for (var result of results) {
		var bird = birds.findBy('speciesCode', result.speciesCode);

		let file = bucket.file(`${bird.order}/${bird.family}/${bird.scientificName}/${result.oldId}.${result.filetype}`);

		await file.delete();
	}
});
