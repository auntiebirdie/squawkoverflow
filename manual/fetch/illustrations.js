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

(async () => {
  try {
    const birdypets = await DB.runQuery(DB.createQuery(['Illustration'])).then(([birdypets]) => {
      return birdypets.map((birdypet) => birdypet.species.speciesCode);
    });

    const noIllustration = [
      "fescoq2", "amsduc1", "finduc1", "mauduc1", "maushe1", "reushe1", "mautud1", "mauwop1", "norgrd1",
      "reupig1", "rodblp1", "rodtud1", "tangrd1", "sthcuc1", "elepit7", "eaafie1", "ruwant3", "ruwant4", "wesfie1", "whbfie9", "ayaant1", 'chaant4', 'chaant5', 'equant1', 'oxaant1', 'panant1', 'punant1',
      'alptap1', 'amptap1', 'blatap2', 'miltap1', 'whwtap1', 'bkfant2', 'ducwoo1', 'soalea1', 'uniwoo1',
      'fruith1', "sponit2", "berhaw1", "abywhe1", 'afywhe2', 'afywhe3', "afywhe4", "alomyz1", 'asccra1', 'berfli1', 'bernih1', 'bertow1', 'biawhi1', "brbpar3", 'brufly1'
    ];

    var errors = 0;

    await DB.runQuery(DB.createQuery(['Bird']).filter('type', '=', 'species')).then(async ([birds]) => {
      for (let bird of birds) {
        if (!birdypets.includes(bird.code) && !noIllustration.includes(bird.code)) {
          console.dir(bird);

          await new Promise((resolve, reject) => {
            axios.get(`https://birdsoftheworld.org/bow/species/${bird.code}/cur/multimedia?media=illustrations`, {
              headers: {
                Cookie: "SA_SESSIONID=YWNlOTc3YTgtM2ZkMy00MDhiLWI3MDQtOWZmYTkzMTAyMjQy;"
              }
            }).then(async (response) => {
              var $ = cheerio.load(response.data);

              if ($('header.SpeciesArticle-header h2').text() != "Illustrations from this Account") {
                if (errors++ > 100) {
                  throw "Not logged in";
                  return false;
                } else {
			console.log("NO ILLUSTRATION");
			console.log("-----");
                  return resolve();
                }
              }

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

                setTimeout(resolve, 4000);
              }
            });
          });
        }
      };
    });
  } catch (err) {
    console.log(err);
  }
})();
