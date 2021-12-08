const Birds = require('../../helpers/birds.js');
const Database = require('../../helpers/database.js');
const Redis = require('../../helpers/redis.js');

Database.fetch({
  kind: 'Member',
  keysOnly: true
}).then(async (members) => {
  for (var member of members) {
    await Redis.fetch('memberpet', {
      FILTER: `@member:{${member[Database.KEY].name}}`
    }).then(async (response) => {
      for (var result of response.results) {
        console.log(`Saving ${result._id}`);

        await Database.save('MemberPet', result._id, {
          birdypetId: result.birdypetId,
          member: result.member,
          nickname: result.nickname,
          description: result.description,
          family: result.family,
          species: result.species,
          speciesCode: result.birdypetSpecies,
          flocks: result.flocks == "NONE" || !result.flocks ? [] : result.flocks.split(','),
          friendship: result.friendship,
	  hatchedAt: result.hatchedAt
        });
      }
    });
  }

  process.exit(0);
});
