const Cache = require('./cache.js');
const Database = require('./database.js');

class Counters {
  get(type, member, id) {
    return new Promise((resolve, reject) => {
      Database.getOne('counters', {
        member: member,
        type: type,
        id: id || ""
      }, {
        select: ['count']
      }).then((result) => {
        resolve(result ? result.count : 0);
      });
    });
  }

  async increment(member, species, variant, birdypet) {
    let promises = [];
    let isNewSpecies = await this.get("birdypedia", member, species).then((count) => count == 0);

    // Increment total number of birds in aviary
    promises.push(Database.query('INSERT INTO counters VALUES (?, "aviary", "total", 1) ON DUPLICATE KEY UPDATE `count` = `count` + 1', [member]));
    promises.push(Cache.increment(`aviary:${member}`, 'birdypets', {
      'member': member
    }));
    // Increment total number of this variant in aviary
    promises.push(Database.query('INSERT INTO counters VALUES (?, "variant", ?, 1) ON DUPLICATE KEY UPDATE `count` = `count` + 1', [member, variant]));
    promises.push(Cache.increment(`species:${member}:${variant}`, 'birdypets JOIN variants ON (birdypets.variant = variants.id)', {
      'member': member,
      'species': species
    }));
    // Increment total number of this species in aviary
    promises.push(Database.query('INSERT INTO counters VALUES (?, "species", ?, 1) ON DUPLICATE KEY UPDATE `count` = `count` + 1', [member, species]));

    if (isNewSpecies) {
      // Insert record of species into birdypedia; this shouldn't have a duplicate key but just to be safe...
      promises.push(Database.query('INSERT INTO counters VALUES (?, "birdypedia", ?, 1) ON DUPLICATE KEY UPDATE `count` = 1', [member, species]));
      promises.push(Cache.increment(`species:${member}`, 'counters JOIN species ON (counters.id = species.id)', {
        member: member,
        type: 'birdypedia',
        count: {
          comparator: '>',
          value_trusted: 0
        }
      }));
      // Increment the count for the family total
      promises.push(Database.query('INSERT INTO counters SELECT ?, "family", species.family, 1 FROM species WHERE species.id = ? ON DUPLICATE KEY UPDATE `count` = `count` + 1', [member, species]));
      // Increment the number for the egg totals
      promises.push(Database.query('INSERT INTO counters SELECT ?, "eggs", species_adjectives.adjective, 1 FROM species_adjectives WHERE species = ? ON DUPLICATE KEY UPDATE `count` = `count` + 1', [member, species]));
      // Unlock the discovery for the Birdypedia entry
      promises.push(Database.query('INSERT IGNORE INTO member_unlocks VALUES (?, ?, ?, NOW())', [member, species, birdypet]));

      // Check for new title unlock
      let totalBirds = await Database.count('species');
      let memberBirds = await Database.count('member_unlocks JOIN species ON (member_unlocks.species = species.id)', {
        member: member
      });
      let percentageBirds = memberBirds / totalBirds;
      let newTitle = 0;

      if (percentageBirds >= 1) {
        newTitle = 4;
      } else if (percentageBirds >= .75) {
        newTitle = 3;
      } else if (percentageBirds >= .50) {
        newTitle = 2;
      } else if (percentageBirds >= .25) {
        newTitle = 1;
      }

      if (newTitle) {
        Database.query('INSERT IGNORE INTO member_titles VALUES (?, ?)', [member, newTitle]);
      }
    }

    return Promise.allSettled(promises);
  }

  decrement(member, species, variant) {
    let promises = [];

    if (member) {
      // Decrement total number of birds in aviary
      promises.push(Database.query('INSERT INTO counters VALUES (?, "aviary", "total", 1) ON DUPLICATE KEY UPDATE `count` = `count` - 1', [member]));
      promises.push(Cache.decrement(`aviary:${member}`, 'birdypets', {
        'member': member
      }));
      // Decrement total number of this variant in aviary
      promises.push(Database.query('INSERT INTO counters VALUES (?, "variant", ?, 1) ON DUPLICATE KEY UPDATE `count` = `count` - 1', [member, variant]));
      promises.push(Cache.decrement(`species:${member.id}:${variant}`, 'birdypets JOIN variants ON (birdypets.variant = variants.id)', {
        'member': member,
        'species': species
      }));
      // Decrement total number of this species in aviary
      promises.push(Database.query('INSERT INTO counters VALUES (?, "species", ?, 1) ON DUPLICATE KEY UPDATE `count` = `count` - 1', [member, species]));
    }

    return Promise.allSettled(promises);
  }
}

module.exports = new Counters;
