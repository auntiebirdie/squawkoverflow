const {
  Storage
} = require('@google-cloud/storage');

const Bird = require('../models/bird.js');
const Database = require('../helpers/database.js');
const Member = require('../models/member.js');
const Webhook = require('../helpers/webhook.js');
const Variant = require('../models/variant.js');

const secrets = require('../secrets.json');
const storage = new Storage();
const bucket = storage.bucket('squawkoverflow');
const Jimp = require('jimp');
const uuid = require('short-uuid');
const Tumblr = require('tumblr.js');

module.exports = async (req, res) => {
  switch (req.method) {
    case "GET":
      let variant = new Variant(req.query.id);

      await variant.fetch({
        include: req.query.include
      });

      res.json(variant);
      break;
    case "POST":
      var existing = null;
      var data = req.body;

      var member = new Member(req.body.loggedInUser);

      await member.fetch();

      if (!member.admin && !member.contributor) {
        return res.error(403);
      }

      if (data.id) {
        existing = await Database.query('SELECT * FROM variants WHERE id = ?', [data.id]).then(([result]) => result);
      }

      var key = existing ? existing.id : uuid.generate();

      if (data.contributor && data.contributor != "undefined") {
        await Database.query('INSERT IGNORE INTO member_badges VALUES (?, "contributor", NOW())', [data.contributor]);
        await Database.query('DELETE FROM member_variants WHERE variant = ? AND type = "contributor"', [key]);
        await Database.query('INSERT IGNORE INTO member_variants VALUES (?, ?, "contributor")', [data.contributor, key]);
      }

      if (!data.credit || data.credit?.trim() == "") {
        data.credit = "Unknown";
      }

      data.credit = data.credit.trim();

      await new Promise(async (resolve, reject) => {
        if (data.files?.image) {
          let bird = new Bird(data.species);

          await bird.fetch();

          data.filetype = data.files.image.type.split('/').pop();

          let file = bucket.file(`birds/${key.slice(0, 1)}/${key.slice(0, 2)}/${key}.${data.filetype}`);

          await Jimp.read(data.files.image.path).then(async (image) => {
            var mimes = {
              "jpg": "JPEG",
              "jpeg": "JPEG",
              "png": "PNG"
            };

            if (image.bitmap.height > 600) {
              await image.resize(Jimp.AUTO, 600);
            }

            await image
              .quality(90)
              .getBuffer(Jimp[`MIME_${mimes[data.filetype]}`], async (err, buff) => {
                await file.save(buff);

                resolve();
              });
          });
        } else {
          resolve();
        }
      }).then(async () => {
        if (existing) {
          await Database.query('UPDATE variants SET source = ?, subspecies = ?, credit = ?, license = ?, notes = ?, full = ?, special = ?, filetype = ?, style = ?, label = ?, updatedAt = NOW() WHERE id = ?', [data.source, data.subspecies, data.credit, data.license, data.notes, data.full, data.special, data.filetype || existing.filetype, data.style, data.label, key]);

          if (data.credit != existing.credit) {
            await Database.query('UPDATE artists SET numVariants = numVariants - 1, numIllustrations = numIllustrations - ?, numPhotos = numPhotos - ? WHERE name = ?', [data.style == 1 ? 1 : 0, data.style == 2 ? 1 : 0, existing.credit]);
            await Database.query('UPDATE artists SET numVariants = numVariants + 1, numIllustrations = numIllustrations + ?, numPhotos = numPhotos + ? WHERE name = ?', [data.style == 1 ? 1 : 0, data.style == 2 ? 1 : 0, data.credit]);
          } else if (data.style != existing.style) {
            await Database.query('UPDATE artists SET numIllustrations = numIllustrations + ?, numPhotos = numPhotos + ? WHERE name = ?', [data.style == 1 ? 1 : -1, data.style == 2 ? 1 : -1, data.credit]);
          }
        } else {
          await Database.query('INSERT INTO variants VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())', [key, data.species, data.subspecies, data.label, data.credit, data.source, data.license, data.notes, data.filetype || "", data.style, data.full, data.special]);
          await Database.query('INSERT INTO artists VALUES (?, 1, ?, ?) ON DUPLICATE KEY UPDATE numVariants = numVariants + 1, numIllustrations = numIllustrations + ?, numPhotos = numPhotos + ?', [data.credit, data.style == 1 ? 1 : 0, data.style == 2 ? 1 : 0, data.style == 1 ? 1 : 0, data.style == 2 ? 1 : 0]);
        }

        let variant = new Variant(key);

        await variant.fetch({
          include: ['adjectives']
        });

        /* Temporary migration automation */

        var birdypets = await Database.query('SELECT birdypets.id FROM birdypets JOIN variants AS original ON (birdypets.variant = original.id) WHERE original.source = "n/a" AND original.species IN (SELECT species FROM variants WHERE species = original.species AND source != "n/a")');
        var promises = [];

        for (let birdypet of birdypets) {
          promises.push(Database.query('UPDATE birdypets JOIN variants AS original ON (birdypets.variant = original.id) SET variant = COALESCE((SELECT id FROM variants WHERE source != "n/a" AND species = original.species LIMIT 1), birdypets.variant) WHERE birdypets.id = ?', [birdypet.id]));
        }

        await Promise.all(promises);

        var duplicates = await Database.query('SELECT id FROM variants WHERE source ="n/a" AND species IN (SELECT species FROM variants WHERE source != "n/a") AND id NOT IN (SELECT variant FROM birdypets)');
        promises = [];

        for (let variant of duplicates) {
          promises.push(Database.query('DELETE FROM variants WHERE id = ?', [variant.id]));
        }

        await Promise.all(promises);

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
              title: variant.bird.commonName,
              url: `https://squawkoverflow.com/birdypedia/bird/${variant.bird.id_slug}?variant=${key}`,
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

          if (secrets.ENV == "PROD") {
            const tumblr = Tumblr.createClient({
              consumer_key: secrets.TUMBLR.OAUTH_KEY,
              consumer_secret: secrets.TUMBLR.OAUTH_SECRET,
              token: secrets.TUMBLR.squawkoverflow.OAUTH_TOKEN,
              token_secret: secrets.TUMBLR.squawkoverflow.OAUTH_TOKENSECRET
            });

            let lastEgg = variant.bird.adjectives.pop();

            await new Promise((resolve, reject) => {
              tumblr.createPhotoPost('squawkoverflow', {
                type: 'photo',
                state: 'queue',
                tags: ['squawkoverflow', variant.bird.commonName, variant.bird.scientificName, 'birds', data.credit].join(',').toLowerCase(),
                source_url: data.source,
                source: variant.image,
                caption: `<h2>A new variant has been added!</h2><p>${variant.bird.commonName} <i>(${variant.bird.scientificName})</i><br><a href="${data.source}">© ${data.credit}</a></p><p>It hatches from ${variant.bird.adjectives.join(', ')}, and ${lastEgg} eggs.</p><p><a href="https://squawkoverflow.com/">squawkoverflow - the ultimate bird collecting game</a><br>&nbsp; &nbsp; &nbsp; &nbsp; &nbsp;🥚 hatch &nbsp; &nbsp;❤️ collect &nbsp; &nbsp; 🤝 connect</p>`
              }, function(err, resp) {
                console.log(err, resp);
                resolve();
              });

              res.json(key);
            });
          } else {

            res.json(key);
          }
        } else {
          res.json(data.id);
        }
      });

      break;
    default:
      return res.error(405);
  }
};