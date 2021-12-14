const Illustration = require('../models/illustration.js');
const Cache = require('../helpers/cache.js');
const Redis = require('../helpers/redis.js');

module.exports = (req, res) => {
  switch (req.method) {
    case "GET":
      let promises = [];

      Cache.get('cache', 'freebirds').then(async (freebirds) => {
	      console.log(freebirds.length);
        if (freebirds.length > 0) {
          let ids = [];
          let limit = req.query?.limit || 24;

          freebirds.sort(() => .5 - Math.random());
		console.log('sort');

          for (let i = 0, len = freebirds.length; i < len; i++) {
            try {
              let key = freebirds[i].split(':').pop();
              let illustration = new Illustration(await Redis.get('freebird', key));

              if (!ids.includes(illustration.id)) {
                promises.push(illustration.fetch({
                  include: ['memberData'],
                  member: req.query.loggedInUser
                }));

                illustration.freebirdId = key;

                ids.push(illustration.id);

                if (ids.length == limit) {
                  break;
                }
              }
            } catch (err) {
              console.error(err);
            }
          }
        }

	      console.log('promise all');

        Promise.all(promises).then((data) => {
		console.log('return data');
          res.json({
            totalPages: 0,
            results: data
          });
        });
      });

      break;
    default:
      return res.sendStatus(405);
  }
};
