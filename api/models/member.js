const Counters = require('../helpers/counters.js');
const Database = require('../helpers/database.js');
const Redis = require('../helpers/redis.js');

const Birds = require('../collections/birds.js');
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

          this.settings = member.settings ? JSON.parse(member.settings) : {};

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

          this.active = member.lastLogin > lastMonth || member.lastHatchAt > lastMonth;
          this.joinedAt = member.joinedAt;
          this.lastHatchAt = member.lastHatchAt;
          this.lastRefresh = member.lastRefresh || 0;
          this.birdyBuddy = member.birdyBuddy;

          let promises = [];

          for (let include of params.include || []) {
            switch (include) {
              case 'aviary':
                this.aviary = await Counters.get('aviary', this.id);
                break;
              case 'birdyBuddy':
                if (member.birdyBuddy) {
                  this.birdyBuddy = new BirdyPet(member.birdyBuddy);
                  await this.birdyBuddy.fetch();
                }
                break;
              case 'featuredFlock':
                if (member.flock) {
                  this.featuredFlock = new Flock(member.flock);
                  await this.featuredFlock.fetch();
                } else {
                  this.featuredFlock = null;
                }
                break;
              case 'flocks':
                this.flocks = await Flocks.all(this.id);
                break;
              case 'families':
                try {
                  let families = require('../data/families.json');

                  this.families = Object.values(families).map((family) => {
                    promises.push(Counters.get('family', this.id, family.value).then((value) => {
                      family.owned = value;
                    }));

                    return family;
                  });
                } catch (err) {
                  console.log(err);
                  this.families = [];
                }
                break;
              case 'wishlist':
                this.wishlist = await Cache.get('wishlist', this.id);
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
    return new Promise(async (resolve, reject) => {
      let birds = [];

      await Cache.get('wishlist', this.id).then((results) => {
        if (family) {
          try {
            birds = JSON.parse(results[family]);
          } catch (err) {}
        } else {
          Object.values(results).forEach((result) => {
            try {
              JSON.parse(result).forEach((speciesCode) => {
                birds.push(speciesCode);
              });
            } catch (err) {}
          });
        }
      });

      birds = birds.map((speciesCode) => Birds.findBy('speciesCode', speciesCode));

      resolve(birds);
    });
  }

  updateWishlist(speciesCode, action) {
    let birds = require('../data/birds.json');
    let bird = birds.find((bird) => bird.speciesCode == speciesCode);

    return new Promise(async (resolve, reject) => {
        if (action == "add") {
		await Database.create('wishlist', { member: this.id, species: bird.speciesCode, intensity: 1 });
        } else if (action == "remove") {
		await Database.delete('wishlist', { member: this.id, species: bird.speciesCode });
        }

        await Redis.connect('cache').del(`wishlist:${this.id}`);

        resolve();
    });
  }
}

module.exports = Member;
