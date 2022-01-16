const Counters = require('../helpers/counters.js');
const Database = require('../helpers/database.js');
const Redis = require('../helpers/redis.js');

const Bird = require('./bird.js');
const BirdyPet = require('./birdypet.js');
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
        bugs: 0,
        joinedAt: new Date(),
        lastLoginAt: new Date(),
        settings: JSON.stringify({}),
      }).then(() => {
        resolve();
      });
    });
  }

  fetch(params = {}) {
    return new Promise((resolve, reject) => {
      Database.get('members', {
        'id': this.id
      }).then(async ([member]) => {
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
            this.settings = member.settings ? JSON.parse(member.settings) : {};
          } catch (err) {
            console.log(member.settings);
            this.settings = {};
          }

          var tier = {
            name: "Birder",
            eggTimer: 10,
            aviaryLimit: 11000,
            extraInsights: false
          };

          switch (`${member.tier}`) {
            case "1205":
              tier.name = "Auntie Birdie";
              tier.eggTimer = 0;
              tier.aviaryLimit = Infinity;
              tier.extraInsights = true;
              break;
            case "101":
              tier.name = "Owlpha Squad";
              tier.eggTimer = 10; // opt-in for timer
              tier.aviaryLimit = Infinity;
              tier.extraInsights = true;
              break;
            case "100":
              tier.name = "Owlpha Squad";
              tier.eggTimer = 0;
              tier.aviaryLimit = Infinity;
              tier.extraInsights = true;
              break;
            case "3":
              tier.name = "Bird Fanatic";
              tier.eggTimer = 0;
              tier.aviaryLimit = Infinity;
              tier.extraInsights = true;
              break;
            case "2":
              tier.name = "Bird Collector";
              tier.eggTimer = 0;
              tier.aviaryLimit = Infinity;
              break;
            case "1":
              tier.name = "Bird Lover";
              tier.eggTimer = 0;
              break;
          }

          this.tier = tier;
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

          let lastMonth = new Date().setMonth(new Date().getMonth() - 1);

          this.active = true; //this.active = member.lastLogin > lastMonth || member.lastHatchedAt > lastMonth;
          this.joinedAt = member.joinedAt;
          this.lastHatchAt = member.lastHatchAt;
          this.lastRefresh = member.lastRefresh || 0;
          this.birdyBuddy = member.birdyBuddy;

          let promises = [];

          for (let include of params.include || []) {
            switch (include) {
              case 'aviary':
                this.aviary = await Counters.get('aviary', this.id, "total");
                break;
              case 'birdyBuddy':
                if (member.birdyBuddy) {
                  this.birdyBuddy = new BirdyPet(member.birdyBuddy);
                  await this.birdyBuddy.fetch();
                }
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
                await Database.query('SELECT name, display FROM taxonomy WHERE type = "family" ORDER BY name').then((results) => {
                  this.families = results.map((result) => {
                    promises.push(Counters.get('family', this.id, result.name).then((value) => {
                      result.owned = value;
                    }));

                    return result;
                  });
                });
                break;
              case 'hasWishlist':
                this.hasWishlist = await Database.getOne('wishlist', {
                  member: this.id
                });
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

  updateWishlist(speciesCode, action) {
    let birds = require('../data/birds.json');
    let bird = birds.find((bird) => bird.speciesCode == speciesCode);

    return new Promise(async (resolve, reject) => {
      if (action == "add") {
        await Database.create('wishlist', {
          member: this.id,
          species: bird.speciesCode,
          intensity: 1
        });
      } else if (action == "remove") {
        await Database.delete('wishlist', {
          member: this.id,
          species: bird.speciesCode
        });
      }

      await Redis.connect('cache').del(`wishlist:${this.id}`);

      resolve();
    });
  }
}

module.exports = Member;
