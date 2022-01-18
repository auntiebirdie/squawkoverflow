const {
  Storage
} = require('@google-cloud/storage');

const prompt = require('prompt');
const storage = new Storage();
const bucket = storage.bucket('squawkoverflow');
const Jimp = require('jimp');
const uuid = require('short-uuid');

const Database = require('../api/helpers/database.js');

prompt.start();

var fields = ['prefix', 'alias', 'credit', 'url', 'source', 'code', 'subspecies', 'label', 'special'];

prompt.get(fields, async (err, result) => {
  if (err) {
    process.exit(0);
  }

  Database.query('SELECT name AS family, parent AS `order`, scientificName FROM species JOIN taxonomy ON (species.family = taxonomy.name) WHERE code = ?', [result.code]).then(async ([bird]) => {
    console.log(bird);
    if (bird) {
      let existing = null;

      if (result.alias == 'NUM') {
        result.alias = await Database.query('SELECT COUNT(*) AS total FROM variants WHERE prefix = ?', [result.prefix]).then(([result]) => result.total + 1);
      } else {
        existing = await Database.query('SELECT * FROM variants WHERE prefix = ? AND alias = ?', [result.prefix, isNaN(result.alias) ? result.alias : result.alias * 1]).then(([result]) => result);
      }

      var data = {
        prefix: result.prefix,
        alias: result.alias,
        url: result.url,
        source: result.source,
        species: result.code,
        subspecies: result.subspecies,
        credit: result.credit,
        special: result.special == 'special',
        filetype: result.url.split('.').pop(),
        label: result.label
      };

      console.log(data);

      if (existing) {
        var key = existing.id;
        console.log(existing);
        console.log("This will override an EXISTING illustration.  Is that okay?");
      } else {
        var key = uuid.generate();
        console.log("This will create a NEW illustration.  Is that okay?");
      }

      prompt.get(['Type YES to confirm'], async (err, result) => {
        if (err || result['Type YES to confirm'] != "YES") {
          console.log("Cancelling.");
        } else {
          console.log("Saving...");

          if (existing) {
            await Database.query('UPDATE squawkdata.variants SET source = ?, species = ?, subspecies = ?, credit = ?, special = ?, filetype = ?, label = ? WHERE id = ?', [data.source, data.species, data.subspecies, data.credit, data.special, data.filetype, data.label, key]);
          } else {
            await Database.query('INSERT INTO squawkdata.variants VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)', [key, data.prefix, data.alias, data.species, data.subspecies, data.label, data.credit, data.source, data.url, data.filetype, true, data.special]);
          }

          let file = bucket.file(`${bird.order}/${bird.family}/${bird.scientificName}/${key}.${data.filetype}`);

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

		console.log('Done!');

                process.exit(0);
              });
          });
        }
      });
    } else {
      console.log(`${result.code} is not a valid species code`);
    }
  });
});
