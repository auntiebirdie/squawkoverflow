const Variant = require('../models/variant.js');
const Database = require('../helpers/database.js');
const Search = require('../helpers/search.js');

module.exports = async (req, res) => {
  switch (req.method) {
    case "HEAD":
      let families = await Database.query('SELECT DISTINCT species.family FROM species JOIN variants ON (variants.species = species.id) WHERE variants.id IN (SELECT variant FROM birdypets WHERE member IS NULL AND addedAt <= DATE_SUB(NOW(), INTERVAL 10 MINUTE))').then((results) => results.map((result) => result.family));

      return res.json(families);
      break;
    case "GET":
      new Promise((resolve, reject) => {
        const _secrets = require('../secrets.json');

        if (req.query.loggedInUser && _secrets.NAUGHTY_LIST.includes(req.query.loggedInUser)) {
          resolve({
            results: []
          });
        }

        if (req.headers && req.headers['x-forwarded-for'] == '35.208.110.100') {
          Database.get('birdypets', {
            member: {
              comparator: 'IS',
              value_trusted: 'NULL'
            },
            addedAt: {
              comparator: '<=',
              value_trusted: 'DATE_SUB(NOW(), INTERVAL 10 MINUTE)'
            }
          }, {
            order: 'RAND()',
            limit: req.query?.limit || 24
          }).then(async (results) => {
            resolve({
              totalPages: 0,
              totalResults: results.length,
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
            totalResults: response.totalResults,
            results: data
          });
        });
      });

      break;
    default:
      return res.error(405);
  }
};
