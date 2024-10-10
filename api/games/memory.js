const chance = require('chance').Chance();

module.exports = async (req, res) => {
  switch (req.method) {
    case "GET":
      const gameData = [];
      const birdMoji = [
        "duck", "eagle", "flamingo", "owl", "parrot", "peacock", "penguin", "swan"
      ];

      birdMoji.forEach((bird) => {
        gameData.push({
          emoji: bird,
          state: 'hidden'
        }, {
          emoji: bird,
          state: 'hidden'
        });
      });

      res.json(chance.shuffle(gameData));
      break;
    default:
      return res.error(405);
  }
}
