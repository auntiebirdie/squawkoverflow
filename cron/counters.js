const secrets = require('../secrets.json');
const Database = require('../helpers/database.js');

(async () => {
  let siteMembers = await Database.query('SELECT members.id FROM members'); // WHERE lastActivityAt > CURDATE() - INTERVAL 30 DAY');
  let promises = [];

	let counter = 0;

  for (let siteMember of siteMembers) {
	  console.log(counter++, "/", siteMembers.length);
	  promises.push(Database.query('REPLACE INTO counters (SELECT member, "eggs", adjective, COUNT(DISTINCT species.id) FROM species JOIN species_adjectives ON species.id = species_adjectives.species JOIN member_unlocks ON species.id = member_unlocks.species WHERE `member` = ? GROUP BY member, adjective)', [siteMember.id]));
//	  promises.push(Database.query('REPLACE INTO counters (SELECT member, "family", species.family, COUNT(*) FROM member_unlocks JOIN species ON (member_unlocks.species = species.id) WHERE `member` = ? GROUP BY species.family)', [siteMember.id]));
//	  promises.push(Database.query('UPDATE counters SET `count` = (SELECT COUNT(*) FROM birdypets JOIN variants ON (birdypets.variant = variants.id) WHERE birdypets.member = counters.member AND variants.species = counters.id) WHERE member = ? AND type = "species"', [siteMember.id]));
//	  promises.push(Database.query('REPLACE INTO counters (SELECT member, "species", variants.species, COUNT(*) FROM birdypets JOIN variants ON (birdypets.variant = variants.id) WHERE member = ? GROUP BY member, variants.species)', [siteMember.id]));
//	  promises.push(Database.query('REPLACE INTO counters (SELECT member, "variant", variant, COUNT(*) FROM birdypets WHERE member = ? GROUP BY member, variant)', [siteMember.id]));

	  if (promises.length >= 200) {
		  await Promise.allSettled(promises);
		  promises = [];
	  }
  }

  Promise.allSettled(promises).then(() => {
    process.exit(0);
  });
})();
