const Bird = require('../models/bird.js');
const Database = require('../helpers/database.js');
const Member = require('../models/member.js');
const Search = require('../helpers/search.js');

module.exports = async (req, res) => {
  let member = new Member(req.body?.loggedInUser || req.query?.id);

  switch (req.method) {
    case "HEAD":
      let families = await Database.query('SELECT DISTINCT species.family FROM species JOIN wishlist ON (species.id = wishlist.species) WHERE wishlist.member = ?', [req.query.id]).then((results) => results.map((result) => result.family));

      return res.json(families);
      break;
    case "GET":
      Search.query('wishlist', req.query).then((response) => {
        var promises = [];

        response.results = response.results.map((result) => {
          result = new Bird(result.id);

          promises.push(result.fetch({
            include: ['variants', 'memberData'],
            member: req.query.loggedInUser
          }));

          return result;
        });

        Promise.all(promises).then(() => {
          res.json(response);
        });
      });
      break;
    case "PUT":
      if (!req.body.loggedInUser) {
        return res.error(401);
      }

      Database.getOne('wishlist', {
        member: req.body.loggedInUser,
        species: req.body.species
      }).then((wishlist) => {
        let emoji = '❤️';
        let intensity = 1;

        if (wishlist) {
          switch (wishlist.intensity) {
            case 2:
              emoji = '🤍';
              intensity = 0;
              break;
            case 1:
              intensity = 2;
              emoji = '🌟';
              break;
          }
        }

        Database.query('INSERT INTO wishlist VALUES (?, ?, ?, NOW()) ON DUPLICATE KEY UPDATE intensity = ?', [req.body.loggedInUser, req.body.species, intensity, intensity]).then(() => {
          res.json(emoji);
        });
      });
      break;
    case "POST":
      if (!req.body.loggedInUser) {
        return res.error(401);
      }

      let intensity = {
        'none': 0,
        'want': 1,
        'need': 2
      };
      let emoji = ['🤍', '❤️', '🌟'];
      var promises = [];
      var species = [];

      if (req.body.species) {
        species = req.body.species;
      } else {
        species = await new Promise((resolve, reject) => {
          Search.query(req.body.searchType || 'bird', {
            ...req.body,
            id: req.body.loggedInUser,
            perPage: 'all'
          }).then((response) => {
            resolve(response.results.map((result) => result.id));
          });
        });
      }

      for (let specie of species) {
        promises.push(Database.query('INSERT INTO wishlist VALUES (?, ?, ?, NOW()) ON DUPLICATE KEY UPDATE intensity = ?', [req.body.loggedInUser, specie, intensity[req.body.action], intensity[req.body.action]]));

        if (promises.length >= 200) {
          await Promise.allSettled(promises);
          promises = [];
        }
      }

      Promise.all(promises).then(() => {
        res.json(emoji[intensity[req.body.action]]);
      });
      break;
    default:
      return res.error(405);
  }
};
