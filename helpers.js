const {
  Datastore
} = require('@google-cloud/datastore');
const DB = new Datastore({
  namespace: 'squawkoverflow'
});

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
          resolve(results[0]);
        });
      });
    }
  }
}
