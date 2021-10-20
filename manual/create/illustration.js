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

const storage = new Storage();
const bucket = storage.bucket('birdypets');

const birds = require('../../helpers/birds.js');

var prefix = "rijksmuseum";
var id = "RP-P-2000-20";
var code = "carcro1";
var url = "https://cdn.discordapp.com/attachments/865328600101945404/899724509354029127/rijksmuseum_rp-p-2000-20.png";
var credit = "Jacques de Fornazeris";
var special = true;
var version = 'Scarecrow';
var label = '(Halloween)';

(async () => {
  try {
    var key = DB.key(['Illustration', `${prefix}_${id}`]);
    var bird = birds.findBy('speciesCode', code);
    var data = {
      illustration: url,
      species: code,
      credit: credit,
      special: special,
      filetype: url.split('.').pop(),
      version: version,
      label: label,
      full: true,
    };

    await DB.save({
      key: key,
      data: data
    }).catch((err) => {
      console.log(err);
    });

    let file = bucket.file(`${bird.order}/${bird.family}/${bird.scientificName}/${key.name}.${data.filetype}`);

    let response = await axios({
      url: data.illustration,
      responseType: "stream"
    });

    await response.data.pipe(file.createWriteStream());
  } catch (err) {
    console.log(err);
  }
})();
