const helpers = require('../helpers');
const express = require('express');
const router = express.Router();

router.get('/', async (req, res) => {
  var groups = await helpers.DB.fetch({
    "kind": "Flock",
	  "order" : ["name"]
  });

  var groupImages = {};

  for (let group of groups) {
    groupImages[group.name] = await helpers.DB.fetchOne({
      "cacheId": `groupImage_${group.name}`,
      "kind": "Photo",
      "filters": [
        ["flocks", "=", group.name]
      ],
      "order": ["submittedAt", {
        "descending": true
      }],
    });
  }

  res.render('groups/index', {
    groups: groups,
    groupImages: groupImages
  });
});

router.get('/:name', async (req, res) => {
  var group = await helpers.DB.fetchOne({
	  "kind" : "Group",
	  "filters" : [
		  ["name", "=", req.params.name]
	  ]
  });

  var photos = await helpers.DB.fetch({
    "cacheId": `groupPhotos_${group.name}`,
    "kind": "Photo",
    "filters": [
      ["flocks", "=", req.params.name]
    ],
    "order": ["submittedAt", {
      "descending": true
    }]
  });

  res.render('groups/group', {
    group: group,
    photos: photos
  });
});

module.exports = router;
