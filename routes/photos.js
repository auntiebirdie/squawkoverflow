const helpers = require('../helpers');
const express = require('express');
const router = express.Router();

router.get('/unidentified', async (req, res) => {
  var photos = await helpers.DB.fetch({
    "kind": "Photo",
    "filters": [
      ["species", "=", "unidentified"]
    ]
  });

  res.render('photos/unidentified', {
    photos: photos
  });
});

router.get('/:id', async (req, res) => {
  var photo = await helpers.DB.get('Photo', req.params.id * 1);
  var submittedBy = await helpers.DB.get('Member', photo.submittedBy);

  res.render('photos/photo', {
    photo: photo,
    submittedBy: submittedBy
  });
});

module.exports = router;
