const Cache = require('../helpers/cache.js');
const Counters = require('../helpers/counters.js');
const Database = require('../helpers/database.js');
const Redis = require('../helpers/redis.js');
const Search = require('../helpers/search.js');

const Illustration = require('./illustration.js');

class BirdyPet {
  static schema = {};

  constructor(id) {
    this.id = id;
  }

  create(data) {
    return new Promise(async (resolve, reject) => {
      let illustration = new Illustration(data.illustration);

      await illustration.fetch()

      if (illustration) {
        Database.create('BirdyPet', {
          illustration: illustration.id,
          commonName: illustration.bird.name,
          speciesCode: illustration.bird.code,
          family: illustration.bird.family,
          member: data.member,
          flocks: [],
          hatchedAt: Date.now()
        }).then((id) => {
          this.id = id;

          resolve(this.fetch());
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
          for (let key in birdypet) {
            this[key] = birdypet[key];
          }

          this.illustration = new Illustration(birdypet.illustration);

          await this.illustration.fetch();

          if (params.fetchMemberData || params.fetch?.includes('memberData') || params.include?.includes('memberData')) {
            await this.illustration.fetchMemberData(params.member);
          }

          this.bird = this.illustration.bird;
          delete this.illustration.bird;

          try {
            if (typeof this.flocks == "string") {
              this.flocks = JSON.parse(this.flocks);
            }
            if (this.flocks == null) {
              this.flocks = [];
            }

            this.flocks = this.flocks.filter((flock) => flock != '' && flock != 'NONE');
          } catch (err) {}

          resolve(this);
        } else {
          resolve(null);
        }
      });
    });
  }

  set(data) {
    return new Promise(async (resolve, reject) => {
      let promises = [];

      promises.push(Database.set('BirdyPet', this.id, data));
      promises.push(Cache.refresh('birdypet', this.id));

      if (data.member) {
        promises.push(Counters.increment(-1, 'species', this.member, this.bird.code));
        promises.push(Counters.increment(1, 'species', data.member, this.bird.code));
      }

      Promise.all(promises).then(() => {
        resolve();
      });
    });
  }

  delete() {
    return Promise.all([
      Database.delete('BirdyPet', this.id),
      Redis.connect("cache").del(`birdypet:${this.id}`),
      Counters.increment(-1, 'species', this.member, this.bird.code)
    ]);
  }
}

module.exports = BirdyPet;
