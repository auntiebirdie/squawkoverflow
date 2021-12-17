const Illustration = require('../models/illustration.js');
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
              let illustration = new Illustration(freebirds[i]);

              if (!ids.includes(illustration.id)) {
                promises.push(illustration.fetch({
                  include: ['memberData'],
                  member: req.query.loggedInUser
                }));

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
