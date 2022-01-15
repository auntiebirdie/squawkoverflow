const Variant = require('../models/variant.js');
const Database = require('../helpers/database.js');

module.exports = (req, res) => {
  switch (req.method) {
    case "GET":
      let promises = [];

      Database.get('freebirds', {}, {
        order: 'RAND()',
        limit: req.query?.limit || 24
      }).then(async (results) => {
        if (results.length > 0) {
          for (let result of results) {
            let variant = new Variant(result.variant);

            variant.freebird = result.id;

            promises.push(variant.fetch({
              include: ['memberData'],
              member: req.query.loggedInUser
            }));
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
