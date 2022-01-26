const Counters = require('../helpers/counters.js');
const Database = require('../helpers/database.js');

const {
  Storage
} = require('@google-cloud/storage');
const storage = new Storage();
const bucket = storage.bucket('squawkoverflow');

module.exports = (req, res) => {
  if (req.query.firstLetter) {
    Database.query('SELECT * FROM adjectives WHERE adjective LIKE ?', [`${req.query.firstLetter}%`]).then(async (eggs) => {
      if (req.query.loggedInUser) {
        for (let egg of eggs) {
          let icon = `/eggs/${egg.adjective.slice(0, 1).toUpperCase()}/${egg.adjective}.png`;

          egg.icon = await bucket.file(icon).exists() ? icon : '/eggs/D/default.png';
          console.log(egg.icon);
          egg.memberTotal = await Counters.get('eggs', req.query.loggedInUser, egg.adjective);
        }
      }

      res.json(eggs);
    });
  } else {
    Database.getOne('adjectives', {
      adjective: req.query.adjective
    }).then((egg) => {
      res.json(egg);
    });
  }
};