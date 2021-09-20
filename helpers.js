const {Datastore} = require('@google-cloud/datastore');
const DB = new Datastore({
  namespace: 'squawkoverflow'
});
/*
const nsql = require('nsql-cache');
const adapter = require('nsql-cache-datastore');
const cache = new nsql({ db: adapter(DB) });
*/

const birdypets = require('./public/data/birdypets.json');

module.exports = {
  DB: {
    fetch: function({
      kind,
      filters,
      order,
      limit
    }) {
      return new Promise((resolve, reject) => {
        let query = DB.createQuery(kind);

        if (filters) {
          for (filter of filters) {
            query.filter(...filter);
          }
        }

        if (order) {
          query.order(...order);
        }

        if (limit) {
          query.limit(limit);
        }

        DB.runQuery(query).then((results) => {
          resolve(results[0].map((result) => {
            result.id = result[Datastore.KEY].id;

            return result;
          }));
        });
      });
    },
    get: function(key, cache = true) {
      return new Promise((resolve, reject) => {
        DB.get(DB.key(key), { cache : cache }).then(([result]) => {
	      resolve(result);
        });
      });
    },
	 save: function (entity) {
		 return new Promise( (resolve, reject) => {
			 DB.save(entity).then( () => {
				 resolve();
			 });
		 });
	 },
    upsert: function (key, data) {
      return new Promise((resolve, reject) => {
	      DB.upsert({ key: DB.key(key), data : data }).then( (result) => {
		      resolve(result);
	      });
      });
    }
  },
  BirdyPets : {
    fetch: function (id) {
	    return birdypets.find( (birdypet) => birdypet.id == id );
    }
  }
}
