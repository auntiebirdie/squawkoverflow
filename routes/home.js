const helpers = require('../helpers');
const express = require('express');
const router = express.Router();

router.get('/', async (req, res) => {
  var recentlyAdded = await helpers.DB.fetch({
    "kind": "Photo",
    "order": ["submittedAt", {
      "descending": true
    }],
    "limit": 20
  });

  res.render('home/index', {
    recentlyAdded: recentlyAdded
  });
});

module.exports = router;
