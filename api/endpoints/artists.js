const Database = require('../helpers/database.js');
const Redis = require('../helpers/redis.js');
const Search = require('../helpers/search.js');
const Variant = require('../models/variant.js');

module.exports = (req, res) => {
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
    Database.query('SELECT name, MATCH (name) AGAINST (? IN NATURAL LANGUAGE MODE) AS relevance FROM artists WHERE MATCH (name) AGAINST (? IN NATURAL LANGUAGE MODE) AND numVariants > 0 ORDER BY relevance', [req.query.search, req.query.search]).then((results) => {
      res.json(results);
    });
  }
};
