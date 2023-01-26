const secrets = require('../secrets.json');
const Database = require('../helpers/database.js');

(async () => {
  let siteMembers = await Database.query('SELECT members.id FROM members');
  let promises = [];

  for (let siteMember of siteMembers) {
    promises.push('REPLACE INTO counters SELECT counters.member, "species", "total", COUNT(DISTINCT species) FROM counters JOIN species ON (counters.id = species.id) WHERE `member` = ? AND type = "birdypedia"');
    promises.push(Database.query('REPLACE INTO counters SELECT counters.member, "eggs" type, species_adjectives.adjective id, COUNT(DISTINCT species) FROM counters JOIN species_adjectives ON (counters.id = species_adjectives.species) WHERE `member` = ? AND type = "birdypedia" GROUP BY species_adjectives.adjective', [siteMember.member]));
    promises.push(Database.query('REPLACE INTO counters SELECT counters.member, "family", species.family, COUNT(*) FROM counters JOIN species ON (counters.id = species.id) WHERE `member` = ? AND type = "birdypedia" GROUP BY species.family', [siteMember.member]));
  }

  Promise.allSettled(promises).then(() => {
    process.exit(0);
  });
})();
