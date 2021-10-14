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

(async () => {
  try {
    var key = DB.key(['Illustration', "urlocalcrypt1d_898071989942616095"]);
    var bird = birds.findBy('speciesCode', 'alptap1');
    var data = {
      illustration: "https://cdn.discordapp.com/attachments/863866986550001665/898071989972008990/Tatama_Tapaculo.png",
      species: {
	      order: bird.order,
	      family: bird.family,
	      commonName: bird.commonName,
	      scientificName: bird.scientificName,
	      speciesCode: bird.speciesCode
      },
      credit: "Urlocalcrypt1d",
      filetype: 'png',
      version: '',
      label: '',
      full: true
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

	  process.exit(0);
  } catch (err) {
    console.log(err);
  }
})();
