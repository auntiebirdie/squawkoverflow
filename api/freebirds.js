const Variant = require('../models/variant.js');
const Database = require('../helpers/database.js');
const Search = require('../helpers/search.js');

module.exports = (req, res) => {
  switch (req.method) {
    case "GET":
      new Promise((resolve, reject) => {
        if (req.headers && req.headers['x-forwarded-for'] == '35.208.110.100') {
          Database.get('birdypets', { member : { comparator: 'IS', value_trusted: 'NULL' }, addedAt : { comparator : '<=', value_trusted: 'DATE_SUB(NOW(), INTERVAL 10 MINUTE)'  }}, {
            order: 'RAND()',
            limit: req.query?.limit || 24
          }).then(async (results) => {
            resolve({
              totalPages: 0,
              results: results
            });
          });
        } else {
          Search.query('freebird', req.query).then((response) => {
            resolve(response);
          });
        }
      }).then((response) => {
        let promises = [];

        for (let result of response.results) {
          let variant = new Variant(result.variant);

          variant.freebird = result.id;
		variant.nickname = result.nickname;

          promises.push(variant.fetch({
            include: ['memberData'],
            member: req.query.loggedInUser
          }));
        }

        Promise.all(promises).then((data) => {
          res.json({
            totalPages: response.totalPages,
            results: data
          });
        });
      });

      break;
    default:
      return res.error(405);
  }
};
