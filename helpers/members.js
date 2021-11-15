const BirdyPets = require('./birdypets.js');
const Cache = require('./cache.js');
const Database = require('./database.js');
const Redis = require('./redis.js');

module.exports = {
  format: function(member) {
    member.settings = member.settings ? JSON.parse(member.settings) : {};
    var tier = {
      name: "Birder",
      eggTimer: 10,
      aviaryLimit: 11000,
      extraInsights: false
    };

    switch (`${member.tier}`) {
      case "101":
        tier.name = "Owlpha Squad";
        tier.eggTimer = 10; // opt-in for timer
        tier.aviaryLimit = Infinity;
        tier.extraInsights = true;
        break;
      case "100":
        tier.name = "Owlpha Squad";
        tier.eggTimer = 0;
        tier.aviaryLimit = Infinity;
        tier.extraInsights = true;
        break;
      case "3":
        tier.name = "Bird Fanatic";
        tier.eggTimer = 0;
        tier.aviaryLimit = Infinity;
        tier.extraInsights = true;
        break;
      case "2":
        tier.name = "Bird Collector";
        tier.eggTimer = 0;
        tier.aviaryLimit = Infinity;
        break;
      case "1":
        tier.name = "Bird Lover";
        tier.eggTimer = 0;
        break;
    }

    member.tier = tier;
    member.bugs = member.bugs ? member.bugs * 1 : 0;

    let lastMonth = new Date().setMonth(new Date().getMonth() - 1);

    member.active = member.lastLogin > lastMonth || member.lastHatchedAt > lastMonth;

    return member;
  },

  all: function() {
    return new Promise((resolve, reject) => {
      Cache.get('cache', 'members', 's').then((members) => {
        Promise.all(members.map((member) => this.get(member))).then((members) => {
          resolve(members.filter((member) => member.active).sort((a, b) => a.username.localeCompare(b.username)));
        });
      });
    });
  },

  get: function(id) {
    return new Promise((resolve, reject) => {
      Cache.get('member', id).then((member) => {
        if (!member) {
          resolve(null);
        } else {
          resolve(this.format(member));
        }
      });
    });
  },

  set: function(id, data) {
    return Database.set('Member', id, data).then(() => {
      Cache.refresh('member', id, "h");
    });
  },

  addBirdyPet: function(memberId, birdypetId) {
    return new Promise((resolve, reject) => {
      this.get(memberId).then((member) => {
        var birdypet = BirdyPets.get(birdypetId);

        Redis.fetch('memberpet', {
          'FILTER': `@member:{${memberId}} @birdypetSpecies:{${birdypet.species.speciesCode}}`,
          'COUNT': true
        }).then(async (response) => {
          if (response.count == 1) {
            for (var egg in birdypet.species.adjectives) {
              await Redis.databases['cache'].sadd(`eggs-${egg}:${memberId}`, birdypet.species.speciesCode);
              await Redis.databases['cache'].sendCommand('HINCRBY', [`eggTotals:${memberId}`, egg, 1]);
            }

            Redis.databases['cache'].sadd(`species-${birdypet.species.speciesCode}:${memberId}`, birdypet.id);
          }

          resolve();
        });

      });
    });
  },

  removeBirdyPet: function(memberId, birdypetId) {
    return new Promise((resolve, reject) => {
      this.get(memberId).then((member) => {
        var birdypet = BirdyPets.get(birdypetId);

        Redis.fetch('memberpet', {
          'FILTER': `@member:{${memberId}} @birdypetSpecies:{${birdypet.species.speciesCode}}`,
          'COUNT': true
        }).then(async (response) => {
          if (response.count == 0) {
            for (var egg in birdypet.species.adjectives) {
              await Redis.databases['cache'].srem(`eggs-${egg}:${memberId}`, birdypet.species.speciesCode);
              await Redis.databases['cache'].sendCommand('HINCRBY', [`eggTotals:${memberId}`, egg, -1]);
            }

            Redis.databases['cache'].srem(`species-${birdypet.species.speciesCode}:${memberId}`, birdypet.id);
          }

          resolve();
        });
      });
    });
  }
}
