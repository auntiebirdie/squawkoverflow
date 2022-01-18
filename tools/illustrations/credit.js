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

Database.query('SELECT * FROM variants WHERE credit = ""').then(async (results) => {
  for (let result of results) {
    console.log(result);

    await new Promise((resolve, reject) => {
      axios.get(`https://birdsoftheworld.org/bow/species/${result.species}/cur/multimedia?media=illustrations`, {
        headers: {
          Cookie: `SA_SESSIONID=${process.argv[2]}`
        }
      }).then(async (response) => {
        var $ = cheerio.load(response.data);
        let credit = $(`.CarouselResponsive a[data-asset-id="${result.alias}"]`).attr('data-asset-credit').split(' by ').pop().slice(0, -1);

          await Database.query('UPDATE variants SET credit = ? WHERE id = ?', [credit, result.id]);

        resolve();
      }).catch((err) => {
	      console.log(err);
	      /*
        console.log(
          'NOT FOUND',
          `https://birdsoftheworld.org/bow/species/${result.species}/cur/multimedia?media=illustrations`,
          `https://ebird.org/species/${result.species}`
        );
	*/
        return reject();
      });
    });
  }

  console.log('Done!');
  process.exit(0);
});
