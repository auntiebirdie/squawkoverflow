const Database = require('../helpers/database.js');
const Search = require('../helpers/search.js');
const Variant = require('../models/variant.js');

module.exports = async (req, res) => {
  if (!req.body?.loggedInUser && !req.query?.loggedInUser) {
    return res.sendStatus(401);
  }

  switch (req.method) {
    case "HEAD":
      let families = await Database.query('SELECT DISTINCT species.family FROM species JOIN variants ON (species.id = variants.species) JOIN member_variants ON (variants.id = member_variants.variant) WHERE member_variants.member = ?', [req.query.loggedInUser]).then((results) => results.map((result) => result.family));

      res.setHeader('SQUAWK', JSON.stringify(families));

      return res.sendStatus(200);
      break;
    case "GET":
      let promises = [];

      Search.query('incubator', req.query).then((response) => {
        var promises = [];

        response.results = response.results.map((result) => {
          result = new Variant(result.id);

          promises.push(result.fetch());

          return result;
        });

        Promise.all(promises).then(() => {
          res.json(response);
        });
      });

      break;
    case "POST":
      var variant = new Variant(req.body.egg);

      await variant.fetch();

      return res.json(variant);
      break;
    default:
      return res.sendStatus(405);
  }
};
