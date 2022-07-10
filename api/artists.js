const Database = require('../helpers/database.js');
const Redis = require('../helpers/redis.js');
const Search = require('../helpers/search.js');
const Variant = require('../models/variant.js');

module.exports = async (req, res) => {
  switch (req.method) {
    case "HEAD":
      let families = await Database.query('SELECT DISTINCT species.family FROM species JOIN variants ON (variants.species = species.id) WHERE variants.credit = ?', [req.query.id]).then((results) => results.map((result) => result.family));

      return res.json(families);
      break;
    case "GET":
      if (req.query.artist) {
        Database.getOne('artists', {
          name: req.query.artist
        }).then((artist) => {
          res.json(artist);
        });
      } else if (req.query.page) {
        return Search.query('artist', req.query).then((response) => {
          var promises = [];

          for (let i = 0, len = response.results.length; i < len; i++) {
            promises.push(new Promise(async (resolve, reject) => {
              response.results[i].variants = await Database.query('SELECT id FROM variants WHERE credit = ? LIMIT 5', response.results[i].name).then(async (variants) => {
                for (let i = 0, len = variants.length; i < len; i++) {
                  variants[i] = new Variant(variants[i].id);
                }

                return variants;
              });

              resolve();
            }));
          }

          Promise.all(promises).then(() => {
            promises = [];

            for (let result of response.results) {
              for (let variant of result.variants) {
                promises.push(variant.fetch({
                  include: ['memberData'],
                  member: req.query.loggedInUser
                }));
              }
            }

            Promise.all(promises).then(() => {
              res.json(response);
            });
          });
        });
      } else {
        Database.query('SELECT name FROM artists WHERE numVariants > 0').then((results) => {
          res.json(results);
        });
      }
      break;
    default:
      return res.error(405);
  }
};
