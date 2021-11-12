const BirdyPets = require('./birdypets.js');
const Redis = require('./redis.js');

const eggs = require('../public/data/eggs.json');

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

    return member;
  },

  get: function(id) {
    return new Promise((resolve, reject) => {
      Redis.get('member', id).then((member) => {
        if (!member) {
          resolve(null);
        } else {
          resolve(this.format(member));
        }
      });
    });
  },

  addBirdyPet: function(memberId, birdypetId) {
    this.get(memberId).then((member) => {
      var birdypet = BirdyPets.get(birdypetId);

      for (var egg in eggs) {
        if (eggs[egg].species.includes(birdypet.species.speciesCode)) {
          Redis.databases['cache'].sadd(`eggs-${egg}:${memberId}`, birdypet.species.speciesCode);
        }
      }

      Redis.databases['cache'].sadd(`species-${birdypet.species.speciesCode}`, birdypet.id);

      if (member.settings?.general?.includes('updateWishlist')) {
        Redis.pop('wishlist', memberId, birdypet.species.speciesCode);
      }
    });
  },

  removeBirdyPet: function(memberId, birdypetId) {
    this.get(memberId).then((member) => {
      var birdypet = BirdyPets.get(birdypetId);

      Redis.fetch('memberpet', {
        'FILTER': `@member:{${memberId}} @birdypetSpecies:{${birdypet.species.speciesCode}}`,
        'COUNT': true
      }).then((response) => {
        if (response.count == 0) {
          for (var egg in eggs) {
            if (eggs[egg].species.includes(birdypet.species.speciesCode)) {
              Redis.databases['cache'].srem(`eggs-${egg}:${memberId}`, birdypet.species.speciesCode);
            }
          }

          Redis.database['cache'].srem(`species-${birdypet.species.speciesCode}`, birdypet.id);
        }
      });
    });
  }
}