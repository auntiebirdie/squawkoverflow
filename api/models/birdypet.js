const BirdyPets = require('../collections/birdypets.js');
const Cache = require('../helpers/cache.js');
const Redis = require('../helpers/redis.js');

class BirdyPet {
  constructor(id) {
    this.id = id;

    let birdypets = require('../data/birdypets.json');
    let birdypet = birdypets.find((birdypet) => birdypet.id == this.id);

    let birds = require('../data/birds.json');
    let bird = birds.find((bird) => bird.speciesCode == birdypet.speciesCode);

    this.image = `https://storage.googleapis.com/squawkoverflow/${bird.order}/${bird.family}/${bird.scientificName.replace(/\s/, '%20')}/${birdypet.id}.${birdypet.filetype ? birdypet.filetype : "jpg"}`;
    this.label = birdypet.label;
    this.special = birdypet.special || false;
    this.species = bird;

    return this;
  }

  fetchMemberData(memberId) {
    return new Promise(async (resolve, reject) => {
      let wishlist = await Cache.get('wishlist', memberId) || {};

      this.wishlisted = wishlist[this.species.family] ? wishlist[this.species.family].includes(this.species.speciesCode) : false;
      this.owned = 0;

      await Redis.fetch('memberpet', {
        "FILTER": `@member:{${memberId}} @birdypetSpecies:{${this.species.speciesCode}}`,
        "COUNT": true
      }).then((response) => {
        this.owned = response.count
      });

      resolve({
        wishlisted: this.wishlisted,
        owned: this.owned
      });
    });
  }
}

module.exports = BirdyPet;
