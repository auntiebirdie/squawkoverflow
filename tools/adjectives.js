const Database = require('../api/helpers/database.js');

const request = require('request');
const cheerio = require('cheerio');
const natural = require('natural');

const language = "EN"
const defaultCategory = 'N';
const defaultCategoryCapitalized = 'NNP';

var lexicon = new natural.Lexicon(language, defaultCategory, defaultCategoryCapitalized);
var ruleSet = new natural.RuleSet('EN');
var tagger = new natural.BrillPOSTagger(lexicon, ruleSet);

Database.query('SELECT species.code, species.commonName, species.scientificName FROM species WHERE code NOT IN (SELECT species FROM species_adjectives) ORDER BY species.commonName').then(async (results) => {
  for (let result of results) {
    console.log(result);

    await new Promise((resolve, reject) => {
      request({
        url: `https://en.wikipedia.org/wiki/${result.commonName.replace(/\s/g, '_')}`,
        encoding: 'utf8',
        gzip: true,
        jar: true,
        headers: {
          'User-Agent': 'NodeOpenGraphCrawler (https://github.com/samholmes/node-open-graph)'
        }
      }, async function(err, res, body) {
        var $ = cheerio.load(body);
        var adjectives = [];

        $('.mw-parser-output > p').each(function(i, elem) {
          let tags = tagger.tag($(elem).text().split(' '));

          for (let word of tags.taggedWords) {
            if (word.tag == 'JJ') {
              adjectives.push(word.token);
            }
          }
        });

        for (let i = 0, len = Math.min(10, adjectives.length); i < len; i++) {
          let adjective = adjectives[i].toLowerCase();

          console.log(adjective);

          await Database.query('INSERT IGNORE INTO species_adjectives VALUES (?, ?)', [result.code, adjective]);
        }

        resolve();
      });
    });
  }

  console.log('Done!');
  process.exit(0);
});
