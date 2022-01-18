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

Database.query('SELECT variants.id, variants.filetype, species.code, species.family, taxonomy.parent AS `order`, species.scientificName FROM variants JOIN species ON (species.code = variants.species) JOIN taxonomy ON (species.family = taxonomy.name) WHERE taxonomy.parent = ?', [process.argv[2]]).then(async (results) => {
  for (let result of results) {
    await new Promise(async (resolve, reject) => {
      let file = bucket.file(`${result.order}/${result.family}/${result.scientificName}/${result.id}.${result.filetype}`);

	    console.log(`${result.order}/${result.family}/${result.scientificName}/${result.id}.${result.filetype}`);

	    await file.exists((err, data) => {
		    if (err) {
			    console.log(result);
			    throw err;
		    }

		    resolve();
	    });
	    /*
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
          let illustration = tmp.attr('data-asset-src');

          var key = Database.key();
          var data = {
            prefix: 'cornell',
            alias: tmp.attr('data-asset-id'),
            url: tmp.attr('data-asset-src'),
            source: `https://birdsoftheworld.org/bow/species/${result.code}/cur/multimedia?media=illustrations`,
            speciesCode: result.code,
            credit: tmp.attr('data-asset-credit').split(' by ').pop().slice(0, -1),
            special: false,
            filetype: 'jpg',
            label: tmp.attr('data-asset-caption')
          };

          console.log(data);

          await Database.query('INSERT INTO squawkdata.variants VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)', [key, data.prefix, data.alias, data.speciesCode, data.label, data.credit, data.source, data.url, data.filetype, true, data.special]);

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
        console.log(
          'NOT FOUND',
          `https://birdsoftheworld.org/bow/species/${result.code}/cur/multimedia?media=illustrations`,
          `https://ebird.org/species/${result.code}`
        );
        return resolve();
      });
      */
    });
  }

  console.log('Done!');
  process.exit(0);
});
