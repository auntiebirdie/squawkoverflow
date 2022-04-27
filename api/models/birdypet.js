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
          hatchedAt: data.hatchedAt || new Date(),
          addedAt: data.addedAt || new Date()
        }).then(async () => {
          if (data.member) {
            const Member = require('./member.js');

            let member = new Member(data.member);

            await member.fetch();

            if (member.settings.general_updateWishlist) {
              await Database.query('UPDATE wishlist SET intensity = 0 WHERE species = ? AND `member` = ?', [variant.bird.id, member.id]);
            }

            //await Database.query('INSERT INTO birdypet_story VALUES (?, ?, ?, NOW())', [this.id, "hatched", member.id]);
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
      // TODO - add redis
      Database.getOne('birdypets', {
        id: this.id
      }).then(async (birdypet) => {
        if (birdypet) {
          for (let key in birdypet) {
            this[key] = birdypet[key];
          }

          this.descriptionHTML = this.description?.replace(/\</g, '&lt;').replace(/\>g/, '&gt;').replace(/(\bhttps?:\/\/(www.)?(twitter|instagram|youtube|youtu.be|tumblr|facebook)[-A-Z0-9+&@#\/%?=~_|!:,.;]*[-A-Z0-9+&@#\/%=~_|])/gim, '<a href="$1" target="_blank">$1</a>')

          this.friendshipMeter = this.friendship < 10 ? '🤍' : ['💜', '💙', '💚', '💛', '🧡', '❤️', '💖', '💗', '💕', '💞'].slice(0, Math.floor(this.friendship / 10)).join("");

          this.variant = new Variant(birdypet.variant);

          await this.variant.fetch();

          this.bird = this.variant.bird;
          delete this.variant.bird;

          await this.bird.fetch(params);

          if (params.include?.includes('exchangeData')) {
            this.exchangeData = await Database.query('SELECT exchanges.id FROM exchange_birdypets JOIN exchanges ON (exchange_birdypets.exchange = exchanges.id) WHERE birdypet = ? AND statusA >= 0 AND statusB >= 0 AND ((memberA = ? AND statusA BETWEEN 0 AND 2) OR (memberB = ? AND statusB BETWEEN 1 AND 2) OR id = ?)', [this.id, this.member, this.member, params.exchange || 0]);
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

        if (!this.member) {
          //promises.push(Database.query('INSERT INTO birdypet_story VALUES (?, ?, ?)', [this.id, "collected", data.member]));
        }

        data.addedAt = new Date();
        data.friendship = 0;

        if (member.settings.general_updateWishlist) {
          promises.push(Database.query('UPDATE wishlist SET intensity = 0 WHERE species = ? AND `member` = ?', [this.bird.id, member.id]));
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

      if (data.friendship) {
        data.friendship = Math.min(data.friendship, 100);

        if (this.friendship < 100 && data.friendship == 100) {
          promises.push(Database.query('INSERT INTO member_badges VALUES (?, "friendship", NOW()) ON DUPLICATE KEY UPDATE badge = badge', [this.member]));
        }
      }

      Promise.all(promises).then(async () => {
        await Database.set('birdypets', {
          id: this.id
        }, data);

        for (let key in data) {
          switch (key) {
            case 'variant':
              this.variant = new Variant(data[key]);

              await this.variant.fetch();
              break;
            default:
              this[key] = data[key];
          }
        }

        // TODO - just refresh
        await Redis.del(`birdypet:${this.id}`);

        resolve();
      });
    });
  }

  delete() {
    return Promise.all([
      Database.set('birdypets', {
        id: this.id
      }, {
        member: null,
        addedAt: new Date(Date.now() - (10 * 60 * 1000))
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
      Redis.del(`birdypet:${this.id}`),
    ]);
  }
}

module.exports = BirdyPet;
