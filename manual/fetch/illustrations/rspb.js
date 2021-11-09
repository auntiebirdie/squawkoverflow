const {
  Storage
} = require('@google-cloud/storage');

const axios = require('axios');
const cheerio = require('cheerio');

const storage = new Storage();
const bucket = storage.bucket('birdypets');

(async () => {
  await new Promise((resolve, reject) => {
    axios.get(process.argv[1]).then(async (response) => {
      var $ = cheerio.load(response.data);

      let illustrations = $('.CarouselResponsive a');

      for (let i = 0, len = illustrations.length; i < len; i++) {
        let tmp = $(illustrations[i]);
        let illustration = tmp.attr('data-asset-src');

        let key = DB.key(['Illustration', tmp.attr('data-asset-id')]);
        let data = {
          species: bird.code,
          illustration: illustration,
          credit: tmp.attr('data-asset-credit'),
          label: tmp.attr('data-asset-comname').replace(bird.name, '').trim(),
          version: tmp.attr('data-asset-caption'),
          full: true
        };

        await DB.save({
          key: key,
          data: data
        }).catch((err) => {
          console.log(err);
        });

        let file = bucket.file(`${bird.order}/${bird.family}/${bird.scientific}/${tmp.attr('data-asset-id')}.jpg`);

        let response = await axios({
          url: illustration,
          responseType: "stream"
        });

        await response.data.pipe(file.createWriteStream());
      }
    });
  });
})();
