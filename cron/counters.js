const secrets = require('../secrets.json');
const Database = require('../helpers/database.js');

(async () => {
  let siteMembers = await Database.query('SELECT members.id FROM members');
  let promises = [];

  for (let siteMember of siteMembers) {
    //promises.push(Database.query('REPLACE INTO counters SELECT counters.member, "species", "total", COUNT(DISTINCT species) FROM counters JOIN species ON (counters.id = species.id) WHERE `member` = ? AND type = "birdypedia"', [siteMember.id]));
    //promises.push(Database.query('REPLACE INTO counters SELECT counters.member, "eggs" type, species_adjectives.adjective id, COUNT(DISTINCT species) FROM counters JOIN species_adjectives ON (counters.id = species_adjectives.species) WHERE `member` = ? AND type = "birdypedia" GROUP BY species_adjectives.adjective', [siteMember.id]));
    //promises.push(Database.query('REPLACE INTO counters SELECT counters.member, "family", species.family, COUNT(*) FROM counters JOIN species ON (counters.id = species.id) WHERE `member` = ? AND type = "birdypedia" GROUP BY species.family', [siteMember.id]));
	  promises.push(Database.query('REPLACE INTO counters (SELECT member, "eggs", adjective, COUNT(DISTINCT species.id) FROM species JOIN species_adjectives ON species.id = species_adjectives.species JOIN counters ON species.id = counters.id WHERE counters.type = "birdypedia" AND member = ? GROUP BY member, adjective)', [siteMember.id]));
	  promises.push(Database.query('REPLACE INTO counters (SELECT counters.member, "family", species.family, COUNT(*) FROM counters JOIN species ON (counters.id = species.id) WHERE `member` = ? AND type = "birdypedia" GROUP BY counters.member, species.family)', [siteMember.id]));
	  promises.push(Database.query('REPLACE INTO counters (SELECT member, "species", variants.species, COUNT(*) FROM birdypets JOIN variants ON (birdypets.variant = variants.id) WHERE member = ? GROUP BY member, variants.species)', [siteMember.id]));
	  promises.push(Database.query('REPLACE INTO counters (SELECT member, "variant", variant, COUNT(*) FROM birdypets WHERE member = ? GROUP BY member, variant)', [siteMember.id]));

	  if (promises.length >= 200) {
		  await Promise.allSettled(promises);
		  promises = [];
	  }
  }

  Promise.allSettled(promises).then(() => {
    process.exit(0);
  });
})();
