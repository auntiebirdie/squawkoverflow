const Variant = require('../models/variant.js');
const Cache = require('../helpers/cache.js');
const Redis = require('../helpers/redis.js');

module.exports = (req, res) => {
  switch (req.method) {
    case "GET":
      let promises = [];

      Cache.get('cache', 'freebirds').then(async (freebirds) => {
        if (freebirds.length > 0) {
          let ids = [];
          let limit = req.query?.limit || 24;

          freebirds.sort(() => .5 - Math.random());

          for (let i = 0, len = freebirds.length; i < len; i++) {
            try {
              let variant = new Variant(freebirds[i]);

              if (!ids.includes(variant.id)) {
                promises.push(variant.fetch({
                  include: ['memberData'],
                  member: req.query.loggedInUser
                }));

                ids.push(variant.id);

                if (ids.length == limit) {
                  break;
                }
              }
            } catch (err) {
              console.error(err);
            }
          }
        }

        Promise.all(promises).then((data) => {
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
