const {
  Storage
} = require('@google-cloud/storage');

const storage = new Storage();
const bucket = storage.bucket('squawkoverflow');
const Jimp = require('jimp');
const Database = require('../helpers/database.js');

module.exports = async (req, res) => {
  let adjective = req.body.adjective;
  let icon = `eggs/${adjective.slice(0, 1).toUpperCase()}/${adjective}.png`;

  await Database.set('adjectives', {
    adjective: adjective
  }, {
    icon: icon,
    member: req.body.member
  });

  let file = bucket.file(icon);

  Jimp.read(`https://cdn.discordapp.com/emojis/${req.body.id}.png`).then(async (image) => {
    image.getBuffer(Jimp[`MIME_PNG`], async (err, buff) => {
      await file.save(buff);

      Database.query('SELECT COUNT(DISTINCT icon) - 1 art, COUNT(*) total FROM adjectives').then((counts) => {
        res.json(counts[0]);
      });
    });
  });
};
