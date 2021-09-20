const {
  Datastore
} = require('@google-cloud/datastore');

const DB = new Datastore({
  namespace: 'squawkoverflow'
});

const fs = require('fs');
const secrets = require('../secrets.json');
const opengraph = require("open-graph");
const natural = require("natural");
const tokenizer = new natural.WordTokenizer();
const tagger = new natural.BrillPOSTagger(
  new natural.Lexicon("EN", "N", "NNP"),
  new natural.RuleSet("EN")
);

const updateOrder = false;
const updateFamily = false;
const startAt = "Leiothrichidae";
var started = false;

async function updateBirds() {
  var birds = JSON.parse(fs.readFileSync('../public/data/birds.json'));

  for (var order in birds) {
    if (updateOrder) {
      DB.upsert({
        key: DB.key(['Bird', order]),
        data: {
          type: 'order',
          name: order,
          updatedAt: Date.now()
        }
      });
    }

    for (var family in birds[order]) {
      if (updateFamily) {
        DB.upsert({
          key: DB.key(['Bird', family]),
          data: {
            type: 'family',
            name: family,
            display: family.display,
            order: order,
            updatedAt: Date.now()
          }
        });
      }

      if (family == startAt) {
        started = true;
      }

      if (started) {

        for (var bird of birds[order][family].children) {
          console.log(bird);
          var meta = await new Promise((resolve, reject) => {
            opengraph(`https://ebird.org/species/${bird.speciesCode}`, (err, meta) => {
              resolve(meta);
            });
          });

          var adjectives = [...new Set(
            tagger.tag(
              tokenizer.tokenize(
                meta.description.toLowerCase()
              )
            ).taggedWords
            .filter((word) => word.tag == "JJ")
            .map((word) => word.token)
          )];

          await DB.upsert({
            key: DB.key(['Bird', bird.speciesCode]),
            data: {
              type: 'species',
              name: bird.commonName,
              code: bird.speciesCode,
              scientific: bird.scientificName,
              family: family,
              order: order,
              adjectives: adjectives,
              updatedAt: Date.now()
            }
          });

          await new Promise((resolve, reject) => {
            setTimeout(resolve, 2000);
          });
        }
      }
    }
  };
}

updateBirds();