const {
  Datastore
} = require('@google-cloud/datastore');

const {
  Storage
} = require('@google-cloud/storage');

const DB = new Datastore({
  namespace: 'squawkoverflow'
});

const axios = require('axios');
const cheerio = require('cheerio');
const prompt = require('prompt');
const storage = new Storage();
const bucket = storage.bucket('birdypets');
const Jimp = require('jimp');
const uuid = require('short-uuid');

const birds = require('../../helpers/birds.js');

prompt.start();

var fields = ['url', 'source', 'code', 'label'];

prompt.get(fields, function(err, result) {
  if (err) {
    process.exit(0);
  }

	result.prefix = process.argv[2];
	result.alias = process.argv[3];
	result.credit = process.argv[4];

	console.log(result);

  var bird = birds.findBy('speciesCode', result.code);

  if (bird) {
    DB.runQuery(DB.createQuery('Illustration').filter('prefix', '=', result.prefix).filter('alias', '=', result.alias)).then(async ([illustration]) => {
      if (result.alias == "NUM") {
        var aliases = await DB.runQuery(DB.createQuery('Illustration').filter('prefix', '=', result.prefix));

        result.alias = aliases && aliases[0].length > 0  ? aliases[0].length + 1 : 1;
      }

      var data = {
        prefix: result.prefix,
        alias: result.alias,
        url: result.url,
        source: result.source,
        speciesCode: result.code,
        credit: result.credit,
        special: result.special == 'true',
        filetype: result.filetype ? result.filetype : result.url.split('.').pop(),
        label: result.label
      };

      if (illustration.length > 0) {
        var key = illustration[0][DB.KEY];
        console.log("This will override an EXISTING illustration.  Is that okay?");
      } else {
        var key = DB.key(['Illustration', uuid.generate()]);
        console.log("This will create a NEW illustration.  Is that okay?");
      }

      prompt.get(['Type YES to confirm'], function(err, result) {
        if (err || result['Type YES to confirm'] != "YES") {
          console.log("Cancelling.");
        } else {
          console.log("Saving...");

          DB.save({
            key: key,
            data: data
          }).then(async () => {
            let file = bucket.file(`${bird.order}/${bird.family}/${bird.scientificName}/${key.name}.${data.filetype}`);

            await Jimp.read(data.url).then(async (image) => {
              var mimes = {
                "jpg": "JPEG",
                "jpeg": "JPEG",
                "png": "PNG"
              };

              await image.autocrop().getBuffer(Jimp[`MIME_${mimes[data.filetype]}`], async (err, buff) => {
                await file.save(buff);
              });
            });
          });
        }
      });
    });
  } else {
    console.log(`${result.code} is not a valid species code`);
  }
});
