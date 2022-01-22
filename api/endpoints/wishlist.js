const Bird = require('../models/bird.js');
const Database = require('../helpers/database.js');
const Member = require('../models/member.js');

const birdsPerPage = 24;

module.exports = async (req, res) => {
  let member = new Member(req.body?.loggedInUser || req.query?.id);

  switch (req.method) {
    case "HEAD":
      let families = await Database.query('SELECT DISTINCT species.family FROM species JOIN wishlist ON (species.code = wishlist.species) WHERE wishlist.member = ?', [req.query.id]).then((results) => results.map((result) => result.family));

      res.setHeader('SQUAWK', JSON.stringify(families));

      return res.sendStatus(200);
      break;
    case "GET":
      var birdsPerPage = 24;
      var page = (--req.query.page || 0) * birdsPerPage;
      var output = [];

      let query = 'SELECT species.code FROM wishlist JOIN species ON (wishlist.species = species.code)';
      let filters = ['wishlist.member = ?'];
      let params = [req.query.id];

      if (req.query.family) {
        filters.push('species.family = ?');
        params.push(req.query.family);
      }

      if (req.query.search) {
        filters.push('(species.commonName LIKE ? OR species.scientificName LIKE ?)');
        params.push(`%${req.query.search}%`);
        params.push(`%${req.query.search}%`);
      }

      // TODO: validate user has access to extra insights
      if (req.query.loggedInUser && Array.isArray(req.query.extraInsights)) {
        for (let insight of req.query.extraInsights) {
          switch (insight) {
            case 'hatched':
              filters.push('(SELECT `count` FROM counters WHERE `member` = ? AND type = "species" AND id = species.code) > 0');
              params.push(req.query.loggedInUser);
              break;
            case 'unhatched':
              filters.push('(SELECT IF(`count` = 0, NULL, 1) FROM counters WHERE `member` = ? AND type = "species" AND id = species.code) IS NULL');
              params.push(req.query.loggedInUser);
              break;
            case 'somewhere':
              filters.push('(SELECT MAX(`count`) FROM counters WHERE type = "species" AND id = species.code) > 0');
              break;
          }
        }
      }

      if (filters.length > 0) {
        query += ' WHERE ' + filters.join(' AND ');
      }

      query += ' ORDER BY ';

      switch (req.query.sort) {
        case 'scientificName':
          query += 'species.scientificName';
          break;
        case 'commonName':
        default:
          query += 'species.commonName';
      }

      query += ' ' + (req.query.sortDir == 'DESC' ? 'DESC' : 'ASC');

      Database.query(query, params).then((birds) => {

        var totalPages = birds.length;
        var promises = [];

        for (let i = page, len = Math.min(page + birdsPerPage, birds.length); i < len; i++) {
          let bird = new Bird(birds[i].code);

          promises.push(bird.fetch({
            include: ['variants', 'memberData'],
            member: req.query.loggedInUser
          }));

          output.push(bird);
        }

        Promise.all(promises).then(() => {
          output = output.filter((bird) => bird.variants.length > 0);

          res.json({
            totalPages: Math.ceil(totalPages / birdsPerPage),
            results: output
          });
        });
      });
      break;
    case "POST":
    case "DELETE":
      if (!req.body.loggedInUser) {
        return res.sendStatus(401);
      }

      await member.updateWishlist(req.body.speciesCode, req.method == "DELETE" ? "remove" : "add");

      return res.sendStatus(200);
      break;
    default:
      return res.sendStatus(405);
  }
};
