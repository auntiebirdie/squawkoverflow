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
	      this.id = Database.key();
        this.illustration = illustration;
        this.member = data.member;

        Database.create('birdypets', {
		id: this.id,
		member: data.member,
		variant: illustration.id,
		nickname: "",
		description: "",
		friendship: 0,
		hatchedAt: new Date()
        }).then(() => {
          resolve(this);
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

          if (params.include?.includes('memberData') && params.member) {
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

  async set(data) {
    await Database.set('birdypets', { id: this.id }, data);
    await Cache.refresh('birdypet', this.id);

    return true;
  }

  delete() {
    return Promise.all([
      Database.delete('birdypets', { id: this.id }),
      Redis.connect("cache").del(`birdypet:${this.id}`),
    ]);
  }
}

module.exports = BirdyPet;
