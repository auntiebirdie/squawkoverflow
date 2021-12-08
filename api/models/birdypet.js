const Cache = require('../helpers/cache.js');
const Database = require('../helpers/database.js');
const Redis = require('../helpers/redis.js');

const Illustration = require('./illustration.js');

const BirdyPets = require('../collections/birdypets.js');

class BirdyPet {
  static schema = {};

  constructor(id) {
    this.id = id;
  }

  create(data) {
    return new Promise((resolve, reject) => {
      let birdypet = new BirdyPet(data.birdypet);

      if (birdypet) {
        Database.create('BirdyPet', {
          birdypetId: birdypet.id,
          species: birdypet.species,
          speciesCode: birdypet.speciesCode,
          family: birdypet.family,
          member: data.member,
          flocks: null,
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

  fetch(params = {}) {
    return new Promise((resolve, reject) => {
      Cache.get('birdypet', this.id).then(async (birdypet) => {
        if (birdypet) {
          this.illustration = new Illustration(birdypet.illustration);

          await illustration.fetch();

          this.bird = illustration.bird;
          delete illustration.bird;

          for (key in birdypet) {
            this[key] = birdypet[key];
          }

          if (params.fetchMemberData || params.fetch?.includes('memberData') || params.include?.includes('memberData')) {
            this.memberData = await birdypet.fetchMemberData(params.member);
          }

          if (params.fetch?.includes('variants') || params.include?.includes('memberData')) {
            this.variants = Illustrations.fetch('speciesCode', this.bird.speciesCode);
          }

          resolve(this);
        } else {
          resolve(null);
        }
      });
    });
  }

  set(data) {
    return new Promise(async (resolve, reject) => {
      await Database.set('BirdyPet', this.id, data);
      await Cache.refresh('birdypet', this.id);

      resolve();
    });
  }

  delete() {
    return Promise.all([
      Database.delete('BirdyPet', this.id),
      Redis.connect("cache").del(`birdypet:${this.id}`)
    ]);
  }
}

module.exports = BirdyPet;