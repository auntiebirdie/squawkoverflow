const {
  Storage
} = require('@google-cloud/storage');

const prompt = require('prompt');
const storage = new Storage();
const bucket = storage.bucket('squawkoverflow');
const Jimp = require('jimp');
const uuid = require('short-uuid');
const mariadb = require('mariadb');
const secrets = require('../api/secrets.json');

prompt.start();

var fields = ['prefix', 'alias', 'credit', 'url', 'source', 'code', 'label', 'special'];

prompt.get(fields, async (err, result) => {
  if (err) {
    process.exit(0);
  }

  let ENV = process.env.NODE_ENV ? 'PROD' : 'DEV';

  const conn = await mariadb.createConnection({
    host: secrets.DB[ENV].HOST,
    socketPath: secrets.DB[ENV].SOCKET,
    user: secrets.DB[ENV].USER,
    password: secrets.DB[ENV].PASS
  });

  conn.query('USE squawkdata');

  conn.query('SELECT name AS family, parent AS `order`, scientificName FROM species JOIN taxonomy ON (species.family = taxonomy.name) WHERE code = ?', [result.code]).then(async ([bird]) => {
	  console.log(bird);
    if (bird) {
      let existing = null;

      if (result.alias == 'NUM') {
        result.alias = await conn.query('SELECT COUNT(*) AS total FROM variants WHERE prefix = ?', [result.prefix]).then(([result]) => result.total + 1);
      } else {
        existing = await conn.query('SELECT * FROM variants WHERE prefix = ? AND alias = ?', [result.prefix, isNaN(result.alias) ? result.alias : result.alias * 1]).then(([result]) => result);
      }

      var data = {
        prefix: result.prefix,
        alias: result.alias,
        url: result.url,
        source: result.source,
        speciesCode: result.code,
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
	    await conn.query('UPDATE squawkdata.variants SET url = ?, source = ?, species = ?, credit = ?, special = ?, filetype = ?, label = ? WHERE id = ?', [data.url, data.source, data.credit, data.special, data.filetype, data.label, key]);
	  } else {
            await conn.query('INSERT INTO squawkdata.variants VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)', [key, data.prefix, data.alias, data.speciesCode, data.label, data.credit, data.source, data.url, data.filetype, true, data.special]);
          }

          let file = bucket.file(`${bird.order}/${bird.family}/${bird.scientificName}/${key}.${data.filetype}`);

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
        }
      });
    } else {
      console.log(`${result.code} is not a valid species code`);
    }
  });
});
