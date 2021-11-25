const Cache = require('../helpers/cache.js');
const Redis = require('../helpers/redis.js');

const BirdyPet = require('./birdypet.js');

class MemberPet {
  constructor(id) {
    this.id = id;
    this.schema = {};
  }

  create(data) {
    return new Promise((resolve, reject) => {
      let birdypet = new BirdyPet(data.birdypet);

	    this.birdypetId = birdypet.id;
	    this.birdypetSpecies = birdypet.species.speciesCode;
	    this.species = birdypet.species.commonName;
	    this.family = birdypet.species.family;
	    this.member = data.member;
	    this.hatchedAt = Date.now();


      if (birdypet) {
        Redis.create('memberpet', {
          birdypetId: birdypet.id,
          birdypetSpecies: birdypet.species.speciesCode,
          species: birdypet.species.commonName,
          family: birdypet.species.family,
          member: data.member,
          flocks: "NONE",
          hatchedAt: Date.now()
        }).then((id) => {
          this.id = id;

          resolve();
        });
      } else {
        reject();
      }
    });
  }

  fetch(params) {
    return new Promise((resolve, reject) => {
      Redis.get('memberpet', this.id).then((memberpet) => {
	      console.log(memberpet);
          let birdypet = new BirdyPet(memberpet.birdypetId);

          this.member = memberpet.member;
          this.nickname = memberpet.nickname || "";
          this.description = memberpet.description;
          this.flocks = memberpet.flocks == "NONE" ? [] : memberpet.flocks.split(",");
          this.friendship = (memberpet.friendship || 0) * 1;

          this.image = birdypet.image;
	      this.label = birdypet.label;
          this.species = birdypet.species;

          resolve(this);
      });
    });
  }

  set(data) {
    return Promise.all([
      Redis.set('memberpet', this.id, data),
      Cache.refresh('memberpet', this.id)
    ]);
  }
}

module.exports = MemberPet;
