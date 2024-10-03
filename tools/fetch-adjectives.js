const Compromise = require('compromise');
const Database = require('../helpers/database.js');
const Redis = require('../helpers/redis.js');

// https://nodejs.org/en/learn/command-line/accept-input-from-the-command-line-in-nodejs
const readline = require('node:readline');
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Adjectives we would rather skip.
const skipAdjectives = ['breeding', 'high'];

rl.question(`Scientific name: `, async (scientificName) => {
  // Make sure this bird exists.
  let bird = await Database.query('SELECT id, code FROM species WHERE id = ? LIMIT 1', [scientificName]);

  // If it doesn't...
  if (!bird) {
    // Print an error and exit.
    return console.error(`Couldn't find a species with the scientific name ${scientificName}.`);
  }

  if (bird.code) {
    console.log(`https://ebird.org/species/${bird.code}`);
  }

  // Prompt user for eBird description.
  rl.question(`Paste description for parsing: `, async (description) => {

    // Fetch adjectives from description.
    let adjectives = Compromise(description).adjectives().out('array').map((adjective) => {
      // Sanitize the adjectives (lowercase, remove non-alphabetical characters)
      return adjective.toLowerCase().replace(/[^a-z]/g, "");
    }).filter((value, index, array) => {
      // Remove duplicates.
      // For example, if an array has ["yellow", "red", "yellow"], the first instance of yellow will match the indexOf, which
      // returns the index of the first instance of a value. The second yellow won't match, and will be removed.
      return array.indexOf(value) === index;
    }).filter((value) => {
      // Remove adjectives we would rather not have.
      return !skipAdjectives.includes(value);
    })

    // For each adjective found...
    for (let adjective of adjectives) {
      await new Promise(async (resolve, reject) => {
        // Check if this is an already existing adjective...
        let existing_adjective = await Database.query('SELECT COUNT(*) AS count FROM species_adjectives WHERE adjective = ?', [adjective]);

        // If it is...
        if (existing_adjective[0].count > 0) {
          console.log(adjective);

          // Check if this species already has this adjective...
          let species_adjective = await Database.query('SELECT COUNT(*) AS count FROM species_adjectives WHERE species = ? AND adjective = ?', [bird.id, adjective]);

          // If it does not...
          if (species_adjective[0].count == 0) {
            // If this adjective doesn't exist, add it!  Otherwise, do nothing.
            await Database.query('INSERT IGNORE INTO adjectives VALUES (?, 0, NULL, NULL)', [adjective]);

            // Add the adjective to the bird.
            await Database.query('INSERT INTO species_adjectives VALUES (?, ?)', [bird.id, adjective]);

            // Update the adjective "number of species" count.
            await Database.query('UPDATE adjectives SET numSpecies = (SELECT COUNT(*) FROM species_adjectives WHERE adjective = ?) WHERE adjective = ?', [adjective, adjective]);

            // Update member counts.
            await Database.query('REPLACE INTO counters (SELECT member, "eggs", adjective, COUNT(DISTINCT species.id) FROM species JOIN species_adjectives ON species.id = species_adjectives.species JOIN member_unlocks ON species.id = member_unlocks.species WHERE adjective = ? GROUP BY member, adjective)', [adjective]);
          }
        }

        resolve()
      })
    }

    // Flush the Redis cache.
    await Redis.sendCommand(['KEYS', 'eggs:*']).then((results) => {
      for (let result of results) {
        Redis.sendCommand(['DEL', result]);
      }
    });

    process.exit(0);
  });
});
