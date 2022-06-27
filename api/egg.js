const {
  Storage
} = require('@google-cloud/storage');

const storage = new Storage();
const bucket = storage.bucket('squawkoverflow');
const Jimp = require('jimp');
const Database = require('../helpers/database.js');
const Redis = require('../helpers/redis.js');
const secrets = require('../secrets.json');

module.exports = async (req, res) => {
  if (req.body.KNOCKKNOCK == secrets.WHOSTHERE) {
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

        await Database.query('INSERT IGNORE INTO member_badges SELECT members.id, "egg-designer", NOW() FROM members JOIN member_auth ON (members.id = member_auth.member) WHERE member_auth.provider = "discord"  AND member_auth.id = ?', [req.body.member]);

        await Redis.sendCommand(['KEYS', 'eggs:*']).then((results) => {
          for (let result of results) {
            Redis.sendCommand(['DEL', result]);
          }
        });

        Database.query('SELECT COUNT(DISTINCT icon) - 1 art, COUNT(*) total FROM adjectives').then((counts) => {
          res.json(counts[0]);
        });
      });
    });
  }
};
