const Database = require('../../api/helpers/database.js');

const opengraph = require('open-graph');
const natural = require('natural');

const language = "EN"
const defaultCategory = 'N';
const defaultCategoryCapitalized = 'NNP';

var lexicon = new natural.Lexicon(language, defaultCategory, defaultCategoryCapitalized);
var ruleSet = new natural.RuleSet('EN');
var tagger = new natural.BrillPOSTagger(lexicon, ruleSet);

Database.query('SELECT species.commonName, species.scientificName FROM species WHERE code NOT IN (SELECT species FROM species_adjectives)').then(async (results) => {
  for (let result of results) {
    console.log(result.scientificName);
/*
    await new Promise((resolve, reject) => {
      opengraph(`https://ebird.org/species/${result.code}`, async (err, meta) => {
        let tags = tagger.tag(meta.description.split(' '));

        for (let word of tags.taggedWords) {
          if (word.tag == 'JJ') {
            await Database.query('INSERT IGNORE INTO species_adjectives VALUES (?, ?)', [result.code, word.token]);
          }
        }

        resolve();
      });
    });
    */
  }

  console.log('Done!');
  process.exit(0);
});
