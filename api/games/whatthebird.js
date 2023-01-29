const Birds = require('../../collections/birds.js');
const Database = require('../../helpers/database.js');

const axios = require('axios');

module.exports = async (req, res) => {
  switch (req.method) {
    case "GET":
      const gameData = {};

      while (!gameData.photo) {
        gameData.bird = await Birds.random();

        gameData.photo = await axios({
          url: `https://search.macaulaylibrary.org/api/v1/search?taxonCode=${gameData.bird.code.split('-').shift()}&mediaType=p&sort=rating_rank_desc`
        }).then(async (response) => {
          var photos = response.data.results.content;

          if (photos.length <= 10) {
            return null;
          }

          return photos.sort(() => Math.random() - 0.5).shift();
        });
      }

      gameData.orders = await Database.query('SELECT name FROM taxonomy WHERE type = "order" ORDER BY name').then((results) => {
        results = results.map((result) => result.name).sort(() => Math.random() - 0.5).slice(0, 5);

        if (!results.includes(gameData.bird.order)) {
          results[0] = gameData.bird.order;
        }

        return results.sort(() => Math.random() - 0.5);
      });

      gameData.families = await Database.query('SELECT name FROM taxonomy WHERE type = "family" ORDER BY name').then((results) => {
        results = results.map((result) => result.name).sort(() => Math.random() - 0.5).slice(0, 5);

        if (!results.includes(gameData.bird.family)) {
          results[0] = gameData.bird.family;
        }

        return results.sort(() => Math.random() - 0.5);
      });

      // AXIOS call to macaulaylibrary
      res.json(gameData);
      break;
    default:
      return res.error(405);
  }
}
