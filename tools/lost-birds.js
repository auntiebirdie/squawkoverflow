const Axios = require('axios');
const Cheerio = require('cheerio');
const Database = require('../helpers/database.js');
const Redis = require('../helpers/redis.js');

const url = "https://searchforlostbirds.org/birds";

console.log(`Fetching content from ${url} (this will take a moment to load)...`);

Axios({
  url
}).then(async (response) => {
  const $ = Cheerio.load(response.data);

  const containers = $('main > div > ul > li');

  for (let container of containers) {
    let scientificName = $('.table-scientific-name', container).text();
    let lostStatus = $('div > div:nth-child(3) > p', container).text();

    if (lostStatus != 'Found') {
      let bird = await Database.query('SELECT id FROM species JOIN species_names ON (species_names.species = species.id) WHERE id = ? OR (species_names.name = ? AND species_names.lang = "zz") LIMIT 1', [scientificName, scientificName]);

      if (bird) {
        await Database.query('INSERT IGNORE INTO species_adjectives VALUES (?, "list")', [scientificName]);
      } else {
        console.log(scientificName);
      }
    }
  }

  return process.exit(0);
})