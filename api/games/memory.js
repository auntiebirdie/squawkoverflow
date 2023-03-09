const chance = require('chance');

module.exports = async (req, res) => {
  switch (req.method) {
    case "GET":
      const gameData = [];
      const birdMoji = [
        "🦜", "🦃", "🐓", "🦢", "🐦", "🦆", "🐧", "🦉", "🦩", "🦚"
      ];

      chance.pickset(birdMoji, 6).forEach((bird) => {
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
