const express = require('express');
const router = express.Router();

router.get('/', async (req, res) => {
  var json = {
    version: '1.0',
    provider_name: 'SQUAWKoverflow',
    provider_url: 'https://squawkoverflow.com',
    author_name: ' hatch collect connect',
    author_url: 'https://squawkoverflow.com'
  };

  console.log(req.get('Referrer'));

  switch (req.get('Referrer')) {
    case '/':
      json.author_name = '🥚hatch | ❤️collect | 🤝connect';
      json.author_url = 'https://squawkoverflow.com';
      break;
  }

  res.json(json);
});

module.exports = router;