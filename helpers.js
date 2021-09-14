const {Datastore} = require('@google-cloud/datastore');
const DB = new Datastore({
  namespace: 'squawkoverflow'
});

const nsql = require('nsql-cache');
const adapter = require('nsql-cache-datastore');
const cache = new nsql({ db: adapter(DB) });

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
    get: function(key) {
      return new Promise((resolve, reject) => {
        DB.get(DB.key(key)).then((result) => {
          resolve(result[0]);
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
  }
}
