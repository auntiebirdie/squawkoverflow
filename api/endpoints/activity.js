const BirdyPet = require('../models/birdypet.js');

const Database = require('../helpers/database.js');

module.exports = async (req, res) => {
  switch (req.method) {
    case "GET":
      Database.query('SELECT id FROM birdypets ORDER BY hatchedAt DESC LIMIT 5').then((results) => {
        let promises = [];

        for (let result of results) {
          result = new BirdyPet(result.id);
          promises.push(result.fetch());
        }

        Promise.all(promises).then((results) => {
          res.json(results);
        });
      });
      break;
  }
};
