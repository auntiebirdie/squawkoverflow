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
const url = "https://www.worldbirdnames.org/new/updates/species-updates/";

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
    if (header.text() == `Species Updates IOC Version ${version}`) {
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
    let species_common_names = $('td:first', row).text().split(',')
    let species_scientific_names = $('td:nth-child(2)', row).text().split(',')

    // For each species in this row...
    for (let i = 0, len = species_common_names.length; i < len; i++) {
      let data = {
        common_name: species_common_names[i].trim(),
        scientific_name: species_scientific_names[i].trim(),
        notes: $('td:nth-child(6)', row).text().trim()
      };

      let action = $('td:nth-child(3)', row).text().trim();

      switch (action) {
        case "ADD":
          await addSpecies(data);
          break;
        case "DEL":
          await deleteSpecies(data);
          break;
        default:
          return console.error(`Unknown action ${action} for ${data.common_name}`);
      }
    }
  }

  return process.exit(0);
})

// Adds a new species, if it doesn't already exist.
function addSpecies(data) {
  return new Promise(async (resolve, reject) => {
    // Check if this species is already in the Birdypedia.
    let bird = await Database.query('SELECT DISTINCT id, commonName FROM species JOIN species_names ON (species.id = species_names.species) WHERE species.id = ? OR species.commonName = ? OR (species_names.name = ? AND species_names.lang = "zz") LIMIT 1',
      [data.scientific_name, data.common_name, data.scientific_name]
    );

    // If this bird does not exist...
    if (!bird) {
      console.log(`\nAdding ${data.common_name} (${data.scientific_name})...`);

      // Prompt for the Family.
      let family = await promptUser("What is the family for this bird?")

      // Add this species to the Birdypedia.
      await Database.query('INSERT INTO species VALUES (?, NULL, ?, ?, ?)', [data.scientific_name, family, data.common_name, data.scientific_name]);

      // Add a placeholder image.
      await Database.query('INSERT INTO variants VALUES (?, ?, "", "", "n/a", "n/a", 0, NULL, NULL, -1, NULL, NULL, NOW(), NOW())', [Database.key(), data.scientific_name]);

      // Add the "new" adjective.
      await Database.query('INSERT INTO species_adjectives VALUES (?, "new")', [data.scientific_name]);

      // Add the common and scientific names to the species_names table.
      await Database.query('INSERT INTO species_names VALUES (?, ?, "en")', [data.scientific_name, data.common_name]);
      await Database.query('INSERT INTO species_names VALUES (?, ?, "zz")', [data.scientific_name, data.scientific_name]);
    }

    return resolve();

  });
}

// Removes a species by merging it into another.
function deleteSpecies(data) {
  return new Promise(async (resolve, reject) => {
    // Check if this species is already in the Birdypedia.
    let bird = await Database.query('SELECT id, commonName FROM species WHERE species.id = ? OR species.commonName = ? LIMIT 1',
      [data.scientific_name, data.common_name]
    );

    // If this bird does not exist...
    if (bird) {
      console.log(`\nRemoving ${data.common_name} (${data.scientific_name})...`);
      console.log(data.notes);

      // Prompt for species to merge with.
      let mergeName = await promptUser("What is the scientific name of the species to merge this one into?");

      // Make sure the specified bird exists.
      let mergeBird = await Database.query('SELECT DISTINCT id, commonName FROM species JOIN species_names ON (species.id = species_names.species) WHERE species.id = ? OR (species_names.name = ? AND species_names.lang = "zz") LIMIT 1',
        [mergeName, mergeName]
      );

      // If the specified bird doesn't exist...
      if (!mergeBird) {
        console.error(`${mergeName} doesn't exist. Please try again.`)
        // Call this function again to start it over.
        deleteSpecies(data).then(resolve);
      }

      // Update any variants, moving them to the new species and setting the subspecies.
      await Database.query('UPDATE variants SET species = ?, subspecies = ? WHERE species = ?', [mergeBird.id, data.scientific_name.split(' ').pop(), data.scientific_name]);

      // Remove the old species from wishlists.
      await Database.query('DELETE FROM wishlist WHERE species = ?', [data.scientific_name]);

      // Update member counters for the species being merged into.
      await Database.query('REPLACE INTO counters (SELECT `member`, `type`, ?, MAX(`count`) FROM counters WHERE type = "birdypedia" AND id IN (?, ?) GROUP BY `member`)', [mergeBird.id, data.scientific_name, mergeBird.id]);

      // Remove old species counters.
      await Database.query('DELETE FROM counters WHERE id = ?', [data.scientific_name]);

      // Clean up old species adjectives.
      await Database.query('DELETE FROM species_adjectives WHERE species = ?', [data.scientific_name]);

      // Add the old species names to the species being merge dinto.
      await Database.query('UPDATE species_names SET species = ? WHERE species = ?', [mergeBird.id, data.scientific_name]);

      // Remove the species. :(
      await Database.query('DELETE FROM species WHERE id = ?', [data.scientific_name]);

      // If someone unlocked the old species but not the species being merged into, unlock it for them.
      await Database.query('UPDATE IGNORE member_unlocks SET species = ? WHERE species = ?', [mergeBird.id, data.scientific_name]);

      // Clean up old species unlocks.
      await Database.query('DELETE FROM member_unlocks WHERE species = ?', [data.scientific_name]);
    }

    return resolve();
  });
}

function promptUser(question) {
  return new Promise((resolve, reject) => {
    rl.question(`${question} > `, (answer) => {
      resolve(answer);
    });
  });
}
