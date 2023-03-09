const API = require('../helpers/api.js');
const Middleware = require('../helpers/middleware.js');

const express = require('express');
const router = express.Router();

const Games = [{
  id: "whatthebird",
  name: "What the Bird?!",
  description: "Given a random picture of a bird, can you guess its order and family?"
}];

router.get('/', (req, res) => {
  res.render('games', {
    title: 'Games',
    page: 'games',
    games: Games
  });
});

for (let game of Games) {
  router.get(`/${game.id}`, (req, res) => {
    res.render(`games/${game.id}`, {
      title: game.name,
      page: 'games',
      sidebar: `games/${game.id}`,
      game: game
    });
  });
}

router.get('/memory', (req, res) => {
	res.render(`games/memory`, {
		title: 'Memory',
		page: 'games',
		sidebar: 'games/memory',
		game: {
			id: 'memory',
			name: 'Memory',
			description: 'Can you pair the bird and its match?'
		}
	});
});

module.exports = router;
