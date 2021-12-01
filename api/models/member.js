const Cache = require('../helpers/cache.js');
const Database = require('../helpers/database.js');
const Redis = require('../helpers/redis.js');

const Birds = require('../collections/birds.js');
const BirdyPet = require('./birdypet.js');
const Flocks = require('../collections/flocks.js');
const Flock = require('./flock.js');
const MemberPet = require('./memberpet.js');

class Member {
  static schema = {
    username: String,
    avatar: String,
    tier: Number,
    bugs: Number,
    settings: Object,
    pronouns: Object
  };

  constructor(id) {
    this.id = id;
  }

  create(data) {
    return new Promise((resolve, reject) => {
      Database.create('Member', this.id, {
        username: data.username,
        avatar: `https://cdn.discordapp.com/avatars/${this.id}/${this.avatar}.webp`,
        tier: 0,
        bugs: 0,
        joinedAt: Date.now(),
        lastLogin: Date.now()
      }).then(() => {
        resolve(id);
      });
    });
  }

  fetch(params = {}) {
    return new Promise((resolve, reject) => {
      Cache.get('member', this.id).then(async (member) => {
        if (!member) {
          resolve(null);
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

          try {
            this.pronouns = JSON.parse(member.pronouns);
          } catch (err) {
            this.pronouns = {};
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

          this.active = member.lastLogin > lastMonth || member.lastHatchedAt > lastMonth;
          this.joinedAt = member.joinedAt;
          this.lastHatchedAt = member.lastHatchedAt;

          if (params.profile) {
            this.aviary = await Cache.get('aviaryTotals', this.id);
            this.hasWishlist = await Cache.get('wishlist', this.id).then((results) => results ? Object.keys(results).length > 0 : false);

            if (member.birdyBuddy) {
              this.birdyBuddy = new MemberPet(member.birdyBuddy);
              await this.birdyBuddy.fetch();
            }

            if (member.flock) {
              this.flock = new Flock(member.flock);
              await this.flock.fetch();
            }
          }

          if (params.include?.includes('birdyBuddy')) {
            if (!this.birdyBuddy) {
              this.birdyBuddy = new MemberPet(member.birdyBuddy);
              await this.birdyBuddy.fetch();
            }
          }

          if (params.flocks || params.include?.includes('flocks')) {
            this.flocks = await Flocks.all(this.id);
          }

          if (params.families || params.include?.includes('families')) {
            if (!this.aviary) {
              this.aviary = await Cache.get('aviaryTotals', this.id);
            }

            try {
              this.families = Object.keys(this.aviary)
                .filter((key) => this.aviary[key] > 0 && !key.startsWith('_'));
            } catch (err) {
              this.families = [];
            }
          }

          if (params.fetch?.includes('wishlist') || params.include?.includes('wishlist')) {
            this.wishlist = await Cache.get('wishlist', this.id);
          }

          if (this.aviary) {
            this.aviary = this.aviary._total;
          }

          resolve(this);
        }
      });
    });
  }

  set(data) {
    return new Promise(async (resolve, reject) => {
      await Database.set('Member', this.id, data);
      await Cache.refresh('member', this.id);

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
      Database.get('Wishlist', this.id).then(async (results) => {
        let toUpdate = {};

        if (results[bird.family]) {
          toUpdate[bird.family] = results[bird.family];
        } else {
          toUpdate[bird.family] = [];
        }

        if (action == "add") {
          if (!toUpdate[bird.family].includes(bird.speciesCode)) {
            toUpdate[bird.family].push(bird.speciesCode);
          }
        } else if (action == "remove") {
          toUpdate[bird.family] = toUpdate[bird.family].filter((tmp) => tmp != bird.speciesCode);
        }

        if (toUpdate[bird.family].length == 0) {
          toUpdate[bird.family] = null;
        }

        await Database.set('Wishlist', this.id, toUpdate);

        await Redis.connect('cache').del(`wishlist:${this.id}`);

        resolve();
      });
    });
  }
}

module.exports = Member;
