const Axios = require('axios');
const Cheerio = require('cheerio');
const Database = require('../helpers/database.js');
const Redis = require('../helpers/redis.js');

// https://nodejs.org/en/learn/command-line/accept-input-from-the-command-line-in-nodejs
const readline = require('node:readline');
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// A version is required to know what version we're upgrading to.
const version = process.argv[2];

// If a version isn't specified...
if (!version) {
  // Print the error message and quit.
  return console.error("Please specify the version to update to as a command-line argument, e.g. node update-birds 14.2");
}

// If the version specified is less than 13.1...
if (version * 1 < 13.1) {
  // Print the error message and quit.
  return console.error("This version has already been processed. There is no need to do it again!");
}

// Fetch the Species Update page from WorldBirdNames.org
const url = "https://www.worldbirdnames.org/new/updates/english-names/";

console.log(`Fetching content from ${url} (this will take a moment to load)...`);

Axios({
  url
}).then(async (response) => {
  const $ = Cheerio.load(response.data);

  // Collect all the tables on the page.
  const containers = $('div.fl-html');
  var table;

  // Loop through each container.
  for (let container of containers) {
    // Fetch the header in the container.
    let header = $('h3', container);

    // If this is the one we're looking for...
    if (header.text() == `English Name Updates IOC Version ${version}`) {
      // Save it and stop looping.
      table = $('table', container);
      break;
    }
  }

  // If no matching table was found for the specified version...
  if (!table) {
    return console.error(`No table was found for version ${version}. Are you sure it exists?`);
  }

  // Free up memory before we continue.
  delete response;
  delete containers;

  // Collect all the rows in the table's tbody.
  const rows = $('tbody tr', table);

  // Loop through each row.
  for (let row of rows) {
    // Some rows have multiple species in the same row :(
    // Let's operate under the assumption that every row could be comma-delimited.
    let species_old_common_names = $('td:first', row).text().split(',');
    let species_new_common_names = $('td:nth-child(3)', row).text().split(',');
    let species_scientific_names = $('td:nth-child(2)', row).text().split(',');

    // For each species in this row...
    for (let i = 0, len = species_scientific_names.length; i < len; i++) {
      try {
        let data = {
          old_common_name: species_old_common_names[i].trim(),
          new_common_name: species_new_common_names[i].trim(),
          scientific_name: species_scientific_names[i].trim(),
        };

        if (data.scientific_name != '') {
          let bird = await Database.query('SELECT id, commonName FROM species WHERE species.id = ? LIMIT 1',
            [data.scientific_name]
          );

          if (bird) {
            if (bird.commonName == data.old_common_name) {
              await Database.query('INSERT IGNORE INTO species_names VALUES (?, ?, "en")', [data.scientific_name, data.old_common_name]);
              await Database.query('INSERT IGNORE INTO species_names VALUES (?, ?, "en")', [data.scientific_name, data.new_common_name]);

              await Database.query('UPDATE species SET commonName = ? WHERE id = ?', [data.new_common_name, data.scientific_name]);

              console.log(`Updated ${data.old_common_name} to ${data.new_common_name} (${data.scientific_name})`);
            }
          } else {
            console.error(`!! Could not find ${data.old_common_name} (${data.scientific_name})`)
          }
        } else {
          console.error(`!! Could not parse ${data.old_common_name}`)
        }
      } catch (err) {
        console.log(err);
      }
    }
  }

  return process.exit(0);
})

function promptUser(question) {
  return new Promise((resolve, reject) => {
    rl.question(`${question} > `, (answer) => {
      resolve(answer);
    });
  });
}