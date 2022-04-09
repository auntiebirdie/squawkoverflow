const {
  Storage
} = require('@google-cloud/storage');

const Bird = require('../models/bird.js');
const Database = require('../helpers/database.js');
const Member = require('../models/member.js');
const Webhook = require('../helpers/webhook.js');
const Variant = require('../models/variant.js');

const storage = new Storage();
const bucket = storage.bucket('squawkoverflow');
const Jimp = require('jimp');
const uuid = require('short-uuid');

module.exports = async (req, res) => {
  switch (req.method) {
    case "GET":
      let variant = new Variant(req.query.id);

      await variant.fetch();

      res.json(variant);
      break;
    case "POST":
      var existing = null;
      var data = req.body;

      var member = new Member(req.body.loggedInUser);

      await member.fetch();

      if (!member.admin && !member.contributor) {
        return res.sendStatus(403);
      }

      switch (data.url.split('.').pop().toLowerCase()) {
        case 'png':
          data.filetype = 'png';
          break;
        default:
          data.filetype = 'jpg';
      }

      if (data.id) {
        existing = await Database.query('SELECT * FROM variants WHERE id = ?', [data.id]).then(([result]) => result);
      }

      if (existing) {
        var key = existing.id;
        if (member.admin) {
          await Database.query('UPDATE squawkdata.variants SET source = ?, subspecies = ?, credit = ?, full = ?, special = ?, filetype = ?, label = ? WHERE id = ?', [data.source, data.subspecies, data.credit, data.full, data.special, data.filetype, data.label, key]);
        } else {
          await Database.query('UPDATE squawkdata.variants SET subspecies = ?, label = ? WHERE id = ?', [data.subspecies, data.label, key]);
        }
      } else {
        var key = uuid.generate();
        if (member.admin) {
          await Database.query('INSERT INTO squawkdata.variants VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())', [key, data.species, data.subspecies, data.label, data.credit, data.source, data.url, data.filetype, data.full, data.special]);
        } else {
          return res.sendStatus(403);
        }
      }

      if (data.url && !data.url.startsWith('https://storage.googleapis.com/squawkoverflow') && member.admin) {
        let bird = new Bird(data.species);

        await bird.fetch();

        let file = bucket.file(`birds/${key.slice(0, 1)}/${key.slice(0, 2)}/${key}.${data.filetype}`);

        await Jimp.read(data.url).then(async (image) => {
          var mimes = {
            "jpg": "JPEG",
            "jpeg": "JPEG",
            "png": "PNG"
          };

          if (image.bitmap.height > 600) {
            await image.resize(Jimp.AUTO, 600);
          }

          await image
            .autocrop()
            .quality(90)
            .getBuffer(Jimp[`MIME_${mimes[data.filetype]}`], async (err, buff) => {
              await file.save(buff);

              let variant = new Variant(key);

              await variant.fetch({
                bird: bird
              });

              if (!existing && !variant.special) {
                let fields = [];

                if (data.subspecies) {
                  fields.push({
                    name: 'Subspecies',
                    value: data.subspecies,
                    inline: true
                  });
                }

                if (data.label) {
                  fields.push({
                    name: 'Label',
                    value: data.label,
                    inline: true
                  });
                }

                Webhook('updates', {
                  content: "A new variant has been added!",
                  embeds: [{
                    title: bird.commonName,
                    url: `https://squawkoverflow.com/birdypedia/bird/${bird.id_slug}?variant=${data.id}`,
                    fields: fields,
                    image: {
                      url: variant.image
                    },
                    author: {
                      name: `© ${data.credit}`,
                      url: data.source
                    }
                  }]
                });
              }

              res.json(data.id);
            });
        });
      } else {
        res.json(data.id);
      }

      break;
    default:
      return res.sendStatus(405);
  }
};
