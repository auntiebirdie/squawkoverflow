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
var id = "898040979871911987";
var code = "ruwant4";
var url = "https://cdn.discordapp.com/attachments/863866986550001665/898040979754455070/Roufous_margined_Antwren.png";
var credit = "Urlocalcrypt1d";

(async () => {
  try {
    var key = DB.key(['Illustration', `${prefix}_${id}`]);
    var bird = birds.findBy('speciesCode', code);
    var data = {
      illustration: url,
      species: {
	      order: bird.order,
	      family: bird.family,
	      commonName: bird.commonName,
	      scientificName: bird.scientificName,
	      speciesCode: bird.speciesCode
      },
      credit: credit,
      filetype: 'png',
      version: '',
      label: '',
      full: true
    };
/*
    await DB.save({
      key: key,
      data: data
    }).catch((err) => {
      console.log(err);
    });
*/
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
