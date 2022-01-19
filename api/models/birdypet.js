const Cache = require('../helpers/cache.js');
const Counters = require('../helpers/counters.js');
const Database = require('../helpers/database.js');
const Redis = require('../helpers/redis.js');

const Variant = require('./variant.js');

class BirdyPet {
  static schema = {};

  constructor(id) {
    this.id = id;
  }

  create(data) {
    return new Promise(async (resolve, reject) => {
      let variant = new Variant(data.variant);

      await variant.fetch()

      if (variant) {
        this.id = Database.key();
        this.variant = variant;
        this.member = data.member;

        Database.create('birdypets', {
          id: this.id,
          member: data.member,
          variant: variant.id,
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

          this.friendshipMeter = this.friendship < 10 ? '🤍' : ['💜', '💙', '💚', '💛', '🧡', '❤️', '💖', '💗', '💕', '💞'].slice(0, Math.floor(friendship / 10) + 1).join("");

          this.variant = new Variant(birdypet.variant);

          await this.variant.fetch();

          this.bird = this.variant.bird;
          delete this.variant.bird;

          await this.bird.fetch(params);

          try {
            this.flocks = await Database.get('birdypet_flocks', {
              birdypet: this.id
            }, {
              select: ['flock']
            }).then((results) => results.map((result) => result.flock));
          } catch (err) {
            this.flocks = [];
          }

          resolve(this);
        } else {
          resolve(null);
        }
      });
    });
  }

  async set(data) {
    await Database.set('birdypets', {
      id: this.id
    }, data);

    await Cache.refresh('birdypet', this.id);

    return true;
  }

  delete() {
    return Promise.all([
      Database.delete('birdypets', {
        id: this.id
      }),
      Redis.connect("cache").del(`birdypet:${this.id}`),
    ]);
  }
}

module.exports = BirdyPet;
