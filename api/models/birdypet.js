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
        this.bird = this.variant.bird;
        this.member = data.member;

        Database.create('birdypets', {
          id: this.id,
          member: data.member,
          variant: variant.id,
          nickname: "",
          description: "",
          friendship: 0,
          hatchedAt: new Date()
        }).then(async () => {
          const Member = require('./member.js');

          let member = new Member(data.member);

          await member.fetch();

          if (member.settings.general_updateWishlist) {
            await Database.query('UPDATE wishlist SET intensity = 0 WHERE species = ? AND `member` = ?', [variant.bird.code, member.id]);
          }

          resolve(this);
        });
      } else {
        reject();
      }
    });
  }

  fetch(params = {}) {
    return new Promise((resolve, reject) => {
      Database.getOne('birdypets', {
        id: this.id
      }).then(async (birdypet) => {
        if (birdypet) {
          for (let key in birdypet) {
            this[key] = birdypet[key];
          }

          this.descriptionHTML = this.description.replace(/\</g, '&lt;').replace(/\>g/, '&gt;').replace(/(\bhttps?:\/\/(www.)?(twitter|instagram|youtube|youtu.be|tumblr|facebook)[-A-Z0-9+&@#\/%?=~_|!:,.;]*[-A-Z0-9+&@#\/%=~_|])/gim, '<a href="$1" target="_blank">$1</a>')

          this.friendshipMeter = this.friendship < 10 ? '🤍' : ['💜', '💙', '💚', '💛', '🧡', '❤️', '💖', '💗', '💕', '💞'].slice(0, Math.floor(this.friendship / 10)).join("");

          this.variant = new Variant(birdypet.variant);

          await this.variant.fetch();

          this.bird = this.variant.bird;
          delete this.variant.bird;

          await this.bird.fetch(params);

          if (params.include?.includes('exchangeData')) {
            this.exchangeData = await Database.query('SELECT exchanges.id FROM exchange_birdypets JOIN exchanges ON (exchange_birdypets.exchange = exchanges.id) WHERE birdypet = ? AND (memberA = ? OR (memberB = ? AND statusB > 0) OR id = ?)', [this.id, this.member, this.member, params.exchange]).then(([data]) => {
              if (data) {
                return data.id;
              } else {
                return null;
              }
            });
          }

          try {
            this.flocks = await Database.get('birdypet_flocks JOIN flocks ON birdypet_flocks.flock = flocks.id', {
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
    return new Promise(async (resolve, reject) => {
      let promises = [];

      if (data.member && this.member != data.member) {
        const Member = require('./member.js');

        let member = new Member(data.member);

        await member.fetch();

        if (member.settings.general_updateWishlist) {
          promises.push(Database.query('UPDATE wishlist SET intensity = 0 WHERE species = ? AND `member` = ?', [this.bird.code, member.id]));
        }

        promises.push(Database.delete('birdypet_flocks', {
          birdypet: this.id
        }));

        await Database.query('SELECT * FROM exchanges WHERE id IN (SELECT exchange FROM exchange_birdypets WHERE birdypet = ?) AND statusA + statusB BETWEEN 0 AND 3', [this.id]).then(async (exchanges) => {
          for (let exchange of exchanges) {
            let toUpdate = {};

            if (exchange.statusA == 2) {
              toUpdate.statusA = 1;
            }

            if (exchange.statusB == 2) {
              toUpdate.statusB = 1;
            }

            promises.push(Database.query('INSERT INTO exchange_logs VALUES (?, ?, NOW())', [exchange.id, `${this.bird.commonName} was removed from the offer because it was given away.`]));
            promises.push(Database.query('DELETE FROM exchange_birdypets WHERE exchange = ? AND birdypet = ?', [exchange.id, this.id]));

            if (toUpdate.statusA || toUpdate.statusB) {
              await Database.set('exchanges', {
                id: exchange.id
              }, toUpdate);
            }
          }
        });
      } else if (data.variant != this.variant.id) {
        await Database.query('SELECT * FROM exchanges WHERE id IN (SELECT exchange FROM exchange_birdypets WHERE birdypet = ? AND statusA + statusB BETWEEN 0 AND 3)', [this.id]).then(async (exchanges) => {
          for (let exchange of exchanges) {
            promises.push(Database.query('UPDATE exchange_birdypets SET variant = ? WHERE exchange = ? AND birdypet = ?', [data.variant, exchange.id, this.id]));
          }
        });
      }

      Promise.all(promises).then(async () => {
        await Database.set('birdypets', {
          id: this.id
        }, data);

        await Cache.refresh('birdypet', this.id);

        resolve();
      });
    });
  }

  delete() {
    return Promise.all([
      Database.delete('birdypets', {
        id: this.id
      }),
      Database.delete('birdypet_flocks', {
        birdypet: this.id
      }),
      Database.query('SELECT * FROM exchanges WHERE id IN (SELECT exchange FROM exchange_birdypets WHERE birdypet = ? AND statusA + statusB BETWEEN 0 AND 3)', [this.id]).then(async (exchanges) => {
        for (let exchange of exchanges) {
          let toUpdate = {};

          if (exchange.statusA == 2) {
            toUpdate.statusA = 1;
          }

          if (exchange.statusB == 2) {
            toUpdate.statusB = 1;
          }

          await Database.query('INSERT INTO exchange_logs VALUES (?, ?, NOW())', [exchange.id, `${this.bird.commonName} was removed from the offer because it was released.`]);

          await Database.set('exchanges', {
            id: exchange.id
          }, toUpdate);
        }

        await Database.query('DELETE FROM exchange_birdypets WHERE birdypet = ?', [this.id]);
      }),
      Redis.connect("cache").del(`birdypet:${this.id}`),
    ]);
  }
}

module.exports = BirdyPet;
