const Counters = require('../helpers/counters.js');
const Database = require('../helpers/database.js');

const Bird = require('./bird.js');
const Flocks = require('../collections/flocks.js');
const Flock = require('./flock.js');

class Member {
  constructor(id) {
    this.id = id;
  }

  create(data) {
    return new Promise((resolve, reject) => {
      Database.create('members', {
        id: this.id,
        username: data.username,
        avatar: data.avatar,
        tier: data.tier,
        serverMember: false, // TODO - check?
        bugs: 0,
        joinedAt: new Date(),
        lastLoginAt: new Date()
      }).then(() => {
        resolve();
      });
    });
  }

  fetch(params = {}) {
    return new Promise((resolve, reject) => {
      Database.getOne('members', {
        'id': this.id
      }).then(async (member) => {
        if (!member) {
          if (params.createIfNotExists) {
            Database.query('INSERT INTO members (id) VALUES (?)', [this.id]).then(() => {
              resolve(this.fetch());
            });
          }

          reject();
        } else {
          this.username = member.username;
          this.avatar = member.avatar;

          try {
            this.settings = await Database.get('member_settings', {
              member: this.id
            }).then((settings) =>
              settings.reduce((obj, item) => {
                return {
                  ...obj,
                  [item.setting]: item.value
                }
              }, {}));
          } catch (err) {
            console.log(err);
            this.settings = {};
          }

          this.tier = await Database.query('SELECT * FROM tiers WHERE id = ?', [member.tier]).then(([tier]) => tier);

          if (typeof this.settings.title != "undefined" && this.settings.title != this.tier.id) {
            this.title = await Database.getOne('tiers', {
              id: this.settings.title
            }).then((title) => title.name);
          } else {
            this.title = this.tier.name;
          }

          this.bugs = member.bugs ? member.bugs * 1 : 0;

          if (typeof member.pronouns == "string") {
            try {
              this.pronouns = JSON.parse(member.pronouns);
            } catch (err) {
              this.pronouns = {};
            }
          } else {
            this.pronouns = member.pronouns || {};
          }

          if (Array.isArray(this.pronouns)) {
            let tmp = {};

            this.pronouns.forEach((pronoun) => {
              let key = Object.keys(pronoun)[0];

              tmp[key] = pronoun[key] ? "yes" : "neutral";
            });

            this.pronouns = tmp;
          }

          let inactiveMonths = new Date().setMonth(new Date().getMonth() - 3);

          this.active = true; //member.lastLogin > inactiveMonths || member.lastHatchedAt > inactiveMonths;
          this.serverMember = member.serverMember;
          this.joinedAt = member.joinedAt;
          this.lastHatchAt = member.lastHatchAt;
          this.lastRefresh = member.lastRefresh || 0;
          this.birdyBuddy = member.birdyBuddy;
          this.featuredFlock = member.featuredFlock;

          let promises = [];

          for (let include of params.include || []) {
            switch (include) {
              case 'aviary':
                this.aviary = await Counters.get('aviary', this.id, "total");
                break;
              case 'birdyBuddy':
                if (member.birdyBuddy) {
                  const BirdyPet = require('./birdypet.js');

                  this.birdyBuddy = new BirdyPet(member.birdyBuddy);
                  await this.birdyBuddy.fetch();
                }
                break;
              case 'exchangeData':
                this.exchangeData = await Counters.get('exchanges', this.id, "waitingOnMe");
                break;
              case 'featuredFlock':
                if (member.featuredFlock) {
                  this.featuredFlock = new Flock(member.featuredFlock);
                  await this.featuredFlock.fetch();
                } else {
                  this.featuredFlock = null;
                }
                break;
              case 'flocks':
                this.flocks = await Flocks.all(this.id);
                break;
              case 'families':
                this.families = await Database.query('SELECT taxonomy.name, taxonomy.display, IF(counters.count IS NULL, 0, counters.count) owned FROM taxonomy JOIN counters ON (taxonomy.name = counters.id) WHERE taxonomy.type = "family" AND counters.member = ? AND counters.count > 0 ORDER BY taxonomy.name', [this.id]);
                break;
              case 'hasIncubator':
                this.hasIncubator = await Database.count('member_variants', {
                  member: this.id
                });
                break;
              case 'hasWishlist':
                this.hasWishlist = await Database.getOne('wishlist', {
                  member: this.id
                });
                break;
              case 'totals':
                this.totals = {
                  aviary: await Counters.get('aviary', this.id, 'total'),
                  species: await Counters.get('species', this.id, 'total')
                };
                break;
              case 'wishlist':
                this.wishlist = await Database.get('wishlist', {
                  member: this.id
                }, {
                  select: ['species', 'intensity']
                });
                break;
            }
          }

          Promise.all(promises).then(() => {
            resolve(this)
          });
        }
      });
    }).catch((err) => {
      return null;
    });
  }

  set(data) {
    return new Promise(async (resolve, reject) => {
      await Database.set('members', {
        id: this.id
      }, data);

      resolve();
    });
  }

  fetchWishlist(family = null) {
    let birds = [];

    return new Promise((resolve, reject) => {
      Database.get('wishlist', {
        member: this.id
      }, {
        select: ['species', 'intensity']
      }).then(async (results) => {
        for (let i = 0, len = results.length; i < len; i++) {
          let bird = new Bird(results[i].species);

          bird.intensity = results[i].intensity;

          birds.push(bird.fetch());
        }

        Promise.all(birds).then(() => {
          resolve(birds);
        });
      });
    });
  }

  fetchPronoun(pronounCase) {
    var pronouns = require('../data/pronouns.json');

    try {
      for (let key in this.pronouns) {
        if (this.pronouns[key] == "yes") {
          return pronouns[key].cases[pronounCase];
        }
      }
    } catch (err) {
      console.log(err);
    }

    return pronouns["they"].cases[pronounCase];
  }
}

module.exports = Member;
