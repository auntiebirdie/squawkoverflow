const {
  Datastore
} = require('@google-cloud/datastore');
const {
  Storage
} = require('@google-cloud/storage');

const axios = require('axios');
const cheerio = require('cheerio');

const Database = require('../../api/helpers/database.js');
const storage = new Storage();
const bucket = storage.bucket('squawkoverflow');
const Jimp = require('jimp');

Database.query('SELECT species.code, species.family, taxonomy.parent AS `order`, species.scientificName FROM species JOIN taxonomy ON (species.family = taxonomy.name) ORDER BY species.commonName LIMIT 400, 200').then(async (results) => {
  let i = 0;
  let len = results.length;

  for (let result of results) {
    i++;
    console.log(i + '/' + len + ' ' + Math.round(i / len * 100) + '%');
    console.log(result);

    await new Promise((resolve, reject) => {
      axios.get(`https://birdsoftheworld.org/bow/species/${result.code}/cur/multimedia?media=illustrations`, {
        headers: {
          Cookie: `SA_SESSIONID=${process.argv[2]}`
        }
      }).then(async (response) => {
        var $ = cheerio.load(response.data);

        if ($('.Page-section-inner .u-md-size5of6 h2').text() == "There are no illustrations from this Account") {
          console.log(
            'NO ILLUSTRATIONS',
            `https://birdsoftheworld.org/bow/species/${result.code}/cur/multimedia?media=illustrations`,
            `https://ebird.org/species/${result.code}`
          );
          return resolve();
        }

        let illustrations = $('.CarouselResponsive a');

        for (let i = 0, len = illustrations.length; i < len; i++) {
          let tmp = $(illustrations[i]);
          let label = tmp.attr('data-asset-caption').trim();
          let subspecies = tmp.attr('data-asset-comname').includes(" (") ? tmp.attr('data-asset-comname').split(" (").pop().trim().slice(0, -1) : "";

          var key = Database.key();
          var data = {
            prefix: 'cornell',
            alias: tmp.attr('data-asset-id'),
            url: tmp.attr('data-asset-src'),
            source: `https://birdsoftheworld.org/bow/species/${result.code}/cur/multimedia?media=illustrations`,
            species: result.code,
            subspecies: subspecies,
            credit: tmp.attr('data-asset-credit').split(' by ').pop().slice(0, -1),
            special: false,
            filetype: 'jpg',
            label: label
          };

          let existing = await Database.query('SELECT * FROM variants WHERE prefix = ? AND alias = ?', [data.prefix, isNaN(data.alias) ? data.alias : data.alias * 1]).then(([result]) => result);

          if (existing) {
            var key = existing.id;
            var anyChanges = false;

            if (data.species != existing.species) {
              anyChanges = true;
              console.log('SPECIES', existing.species, " -> ", data.species);
            }

            if (data.subspecies && data.subspecies != existing.subspecies) {
              anyChanges = true;
              console.log('SUBSPECIES', existing.subspecies, " -> ", data.subspecies);
            }

            if (data.label != existing.label) {
              anyChanges = true;
              console.log('LABEL', `\`${existing.label}\``, " -> ", `\`${data.label}\``);
            }

            if (data.credit != existing.credit) {
              anyChanges = true;
              console.log('CREDIT', existing.credit, " -> ", data.credit);
            }

            if (!anyChanges) {
              continue;
            }
          } else {
            var key = Database.key();
            console.log("NEW");
          }

          if (existing) {
            await Database.query('UPDATE squawkdata.variants SET source = ?, species = ?, subspecies = ?, credit = ?, special = ?, filetype = ?, label = ? WHERE id = ?', [data.source, data.species, data.subspecies, data.credit, data.special, data.filetype, data.label, key]);
          } else {
            await Database.query('INSERT INTO squawkdata.variants VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)', [key, data.prefix, data.alias, data.species, data.subspecies, data.label, data.credit, data.source, data.url, data.filetype, true, data.special]);
          }

          let file = bucket.file(`${result.order}/${result.family}/${result.scientificName}/${key}.${data.filetype}`);

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
              });
          });
        }

        resolve();
      }).catch((err) => {
        console.log(err);

        console.log(
          'NOT FOUND',
          `https://birdsoftheworld.org/bow/species/${result.code}/cur/multimedia?media=illustrations`,
          `https://ebird.org/species/${result.code}`
        );
        return resolve();
      });
    });
  }

  console.log('Done!');
  process.exit(0);
});
