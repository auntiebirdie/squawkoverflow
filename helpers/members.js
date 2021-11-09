const BirdyPets = require('./birdypets.js');
const Redis = require('./redis.js');

const eggs = require('../public/data/eggs.json');

module.exports = {
  format: function(member) {
    member.settings = member.settings ? JSON.parse(member.settings) : {};

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
    var member = this.get(memberId);
    var birdypet = BirdyPets.get(birdypetId);

    for (var egg in eggs) {
      if (eggs[egg].species.includes(birdypet.species.speciesCode)) {
        Redis.increment('eggTotals', memberId, egg, 1);
      }
    }

    if (member.settings.general?.includes('updateWishlist')) {
      Redis.pop('wishlist', memberId, birdypet.species.speciesCode);
    }
  },

  removeBirdyPet: function(memberId, birdypetId) {
    var member = this.get(memberId);
    var birdypet = BirdyPets.get(birdypetId);

    for (var egg in eggs) {
      if (eggs[egg].species.includes(birdypet.species.speciesCode)) {
        Redis.increment('eggTotals', memberId, egg, -1);
      }
    }
  }
}
