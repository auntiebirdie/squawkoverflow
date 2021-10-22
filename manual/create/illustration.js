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

var prefix = "urlocalcrypt1d";
var id = "899900084928544788";
var code = "soalea1";
var url = "https://cdn.discordapp.com/attachments/863866986550001665/899900084551028746/South_American_Leaftosser_Guianan.png";
var credit = "Urlocalcrypt1d";
var special = false;
var version = "Guianan";
var label = "";

(async () => {
  try {
    var key = DB.key(['Illustration', `${prefix}_${id}`]);
    var bird = birds.findBy('speciesCode', code);
    var data = {
      illustration: url,
      speciesCode: code,
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
