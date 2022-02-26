const express = require('express');
const router = express.Router();

router.get('/', async (req, res) => {
  var json = {
    version: '1.0',
    provider_name: 'SQUAWKoverflow',
    provider_url: 'https://squawkoverflow.com',
  };

  for (let key in req.query) {
    json[key] = req.query[key];
  }

  res.json(json);
});

module.exports = router;
