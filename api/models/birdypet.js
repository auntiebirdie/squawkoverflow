const Cache = require('../helpers/cache.js');
const Redis = require('../helpers/redis.js');

class BirdyPet {
  constructor(id) {
    this.id = id;

    let birdypets = require('../data/birdypets.json');
    let birdypet = birdypets.find((birdypet) => birdypet.id == this.id);

    let birds = require('../data/birds.json');
    let bird = birds.find((bird) => bird.speciesCode == birdypet.speciesCode);

    this.image = `https://storage.googleapis.com/birdypets/${bird.order}/${bird.family}/${bird.scientificName.replace(/\s/, '%20')}/${birdypet.id}.${birdypet.filetype ? birdypet.filetype : "jpg"}`;
	  this.label = birdypet.label;
    this.special = birdypet.special || false;
    this.species = bird;

    return this;
  }

  fetchMemberData(memberId) {
    return new Promise(async (resolve, reject) => {
      let wishlist = await Cache.get('wishlist', memberId) || {};

      this.wishlisted = wishlist[this.species.family] ? wishlist[this.species.family].includes(this.species.speciesCode) : false;
      this.owned = [];

      await Redis.fetch('memberpet', {
        "FILTER": `@member:{${memberId}} @birdypetSpecies:{${this.species.speciesCode}}`,
        "RETURN": ['birdypetId', 'birdypetSpecies']
      }).then((response) => {
        for (let i = 0, len = response.results.length; i < len; i++) {
          this.owned.push(response.results[i].birdypetId);
          this.owned.push(response.results[i].birdypetSpecies);
        }
      });

      resolve();
    });
  }
}

module.exports = BirdyPet;
