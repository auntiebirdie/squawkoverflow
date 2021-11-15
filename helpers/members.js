const Birds = require('./birds.js');
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

    member.pronouns = JSON.parse(member.pronouns);

    if (Array.isArray(member.pronouns)) {
	    let tmp = {};

	    member.pronouns.forEach( (pronoun) => {
		    let key = Object.keys(pronoun)[0];

		    tmp[key] = pronoun[key] ? "yes" : "neutral";
	    });

	    console.log(tmp);

	    member.pronouns = tmp;
    }

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

          if (member.settings.general?.includes('updateWishlist')) {
            await this.updateWishlist(memberId, "remove", birdypet.species);
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
  },

  fetchWishlist: function(memberId, family) {
    return new Promise(async (resolve, reject) => {
      let birds = [];

      await Cache.get('wishlist', memberId).then((results) => {
        if (family) {
          try {
            birds = JSON.parse(results[family]);
          } catch (err) {}
        } else {
          Object.values(results).forEach((result) => {
            try {
              JSON.parse(result).forEach((speciesCode) => {
                birds.push(speciesCode);
              });
            } catch (err) {}
          });
        }
      });

      birds = birds.map((speciesCode) => Birds.findBy('speciesCode', speciesCode));

      resolve(birds);
    });
  },

  updateWishlist: function(memberId, action, bird) {
    return new Promise((resolve, reject) => {
      Database.get('Wishlist', memberId).then(async (results) => {
        let toUpdate = {};

        if (results[bird.family]) {
          toUpdate[bird.family] = results[bird.family];
        } else {
          toUpdate[bird.family] = [];
        }

        if (action == "add") {
          toUpdate[bird.family].push(bird.speciesCode);
        } else if (action == "remove") {
          toUpdate[bird.family] = toUpdate[bird.family].filter((tmp) => tmp != bird.speciesCode);
        }

        if (toUpdate[bird.family].length == 0) {
          toUpdate[bird.family] = null;
        }

        await Database.set('Wishlist', memberId, toUpdate);

        await Redis.databases['cache'].del(`wishlist:${memberId}`);

        resolve();
      });
    });
  }
}
