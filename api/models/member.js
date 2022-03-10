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
      let id = Database.key();

      Database.create('members', {
        id: id,
        username: data.username,
        avatar: data.avatar,
        tier: data.tier || 0,
        serverMember: data.serverMember || false,
        joinedAt: new Date(),
        lastLoginAt: new Date()
      }).then(() => {
        Database.create('member_auth', {
          member: id,
          provider: this.id.auth,
          id: this.id.token
        }).then(() => {
          resolve(id);
        });
      });
    });
  }

  exists(params = {}) {
    return new Promise(async (resolve, reject) => {
      if (this.id instanceof Object) {
        var member = await Database.getOne('members JOIN member_auth ON (members.id = member_auth.member)', {
          'provider': this.id.auth,
          'member_auth`.`id': this.id.token
        }, {
          'select': ['members.*']
        });
      } else {
        var member = await Database.getOne('members', {
          'id': this.id
        });
      }

      if (!member) {
        if (params.createIfNotExists) {
          const secrets = require('../secrets.json');
          const {
            Client,
            Intents
          } = require('discord.js');

          const client = new Client({
            intents: [Intents.FLAGS.GUILD_MEMBERS]
          });

          client.login(secrets.DISCORD.BOT_TOKEN);

          client.on('ready', () => {
            client.guilds.fetch(secrets.DISCORD.GUILD_ID).then(async (guild) => {
              await guild.members.fetch(`${auth.id}`).then((member) => {
                params.data.username = member.displayName;
                params.data.avatar = member.displayAvatarURL();
                params.data.serverMember = true;
              }).catch(() => {
                client.users.fetch(`${auth.id}`).then((user) => {
                  params.data.username = user.username;
                  params.deta.avatar = user.avatarURL();
                  params.data.serverMember = false;
                });
              });

              await this.create(params.data || {}).then((id) => {
                this.id = id;

                resolve({
                  ...params.data,
                  id: id
                });
              });
            });
          });
        } else {
          reject();
        }
      } else {
        this.id = member.id;

        resolve(member);
      }
    });
  }

  fetch(params = {}) {
    return new Promise(async (resolve, reject) => {
      var member = await this.exists(params).catch(reject);

      for (let key in member) {
        if (!params.fields || params.fields.includes(key)) {
          this[key] = member[key];
        }
      }

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

      if (!this.settings.theme_style) {
        this.settings.theme_style = 'dark';
      }

      this.tier = await Database.query('SELECT * FROM tiers WHERE id = ?', [member.tier]).then(([tier]) => tier);

      if (typeof this.settings.title != "undefined" && this.settings.title != this.tier.id) {
        this.title = await Database.getOne('tiers', {
          id: this.settings.title
        }).then((title) => title.name);
      } else {
        this.title = this.tier.name;
      }

      // TODO : clean up this mess
      var pronouns = require('../data/pronouns.json');

      this.preferredPronoun = pronouns["they"];

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


      for (let key in this.pronouns) {
        if (this.pronouns[key] == "yes") {
          this.preferredPronoun = pronouns[key];
          break;
        }
      }

      let inactiveMonths = new Date().setMonth(new Date().getMonth() - 3);

      this.active = true; //member.lastLogin > inactiveMonths || member.lastHatchedAt > inactiveMonths;

      let promises = [];

      for (let include of params.include || []) {
        switch (include) {
          case 'auth':
            this.auth = await Database.query('SELECT provider, id FROM member_auth WHERE `member` = ?', [this.id]);
            break;
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
          case 'lastActive':
            let lastActive = Date.now() - Math.max(new Date(this.lastHatchAt).getTime(), new Date(this.lastLoginAt).getTime());

            let days = lastActive / (1000 * 60 * 60 * 24);

            if (days <= 1) {
              this.lastActive = 'Today!';
            } else if (days <= 7) {
              this.lastActive = 'This week';
            } else {
              let weeks = days / 7;

              if (weeks <= 4) {
                this.lastActive = Math.ceil(weeks) + ' weeks ago';
              } else {
                let months = days / 30;

                if (months <= 6) {
                  this.lastActive = Math.ceil(months) + ' months ago';
                } else {
                  this.lastActive = '6+ months ago';
                }
              }
            }
            break;
          case 'rank':
            let total = this.aviary ? this.aviary : await Counters.get('aviary', this.id, 'total');

            this.ranks = [{
              id: 'ultimate',
              label: 'Ultimate',
              minimum: 10000
            }, {
              id: 'penultimate',
              label: 'Penultimate',
              minimum: 5000
            }, {
              id: 'superb',
              label: 'Superb',
              minimum: 2500
            }, {
              id: 'greater',
              label: 'Greater',
              minimum: 1000
            }, {
              id: 'dedicated',
              label: 'Dedicated',
              minimum: 500
            }, {
              id: 'novice',
              label: 'Novice',
              minimum: 100
            }, {
              id: 'beginner',
              label: 'Beginner',
              minimum: 1
            }, {
              id: 'aspiring',
              label: 'Aspiring',
              minimum: 0
            }, {
              id: 'highest',
              label: '(highest available)',
              minimum: 0
            }, {
              id: 'none',
              label: '(none)',
              minimum: 0
            }].map((rank) => {
              return {
                id: rank.id,
                label: total < rank.minimum ? `${rank.label} (${rank.minimum}+ birds)` : rank.label,
                selected: (this.settings.rank || 'highest') == rank.id,
                disabled: total < rank.minimum
              }
            });

            this.rank = this.ranks.find((rank) => rank.selected);

            switch (this.rank.id) {
              case 'highest':
                this.rank = this.ranks.find((rank) => !rank.disabled).label;
                break;
              case 'none':
                this.rank = "";
                break;
              default:
                this.rank = this.rank.label;
                break;
            }

            break;
          case 'tiers':
            this.tiers = await Database.query(`
          SELECT *
          FROM tiers
          WHERE \`member\` = ? OR id = ? OR
          (id < 4 AND id < ?)
          `, [this.id, this.tier.id, this.tier.id]);
            break;
          case 'totals':
            this.totals = {
              aviary: this.aviary ? this.aviary : await Counters.get('aviary', this.id, 'total'),
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

  delete() {
    return new Promise((resolve, reject) => {
      let promises = [];

      promises.push(Database.query('DELETE FROM member_auth WHERE `member` = ?', [this.id]));
      promises.push(Database.query('DELETE FROM members WHERE id = ?', [this.id]));
      promises.push(Database.query('DELETE FROM member_settings WHERE `member` = ?', [this.id]));
      promises.push(Database.query('DELETE FROM member_variants WHERE `member` = ?', [this.id]));
      promises.push(Database.query('DELETE FROM tiers WHERE `member` = ?', [this.id]));
      promises.push(Database.query('DELETE FROM birdypet_flocks WHERE birdypet IN (SELECT id FROM birdypets WHERE `member` = ?) OR flock IN (SELECT id FROM flocks WHERE `member` = ?)', [this.id, this.id]));
      promises.push(Database.query('DELETE FROM flocks WHERE `member` = ?', [this.id]));
      promises.push(Database.query('DELETE FROM exchange_birdypets WHERE exchange IN (SELECT id FROM exchanges WHERE `memberA` = ? OR `memberB` = ?)', [this.id, this.id]));
      promises.push(Database.query('DELETE FROM wishlist WHERE `member` = ?', [this.id]));

      Promise.all(promises).then(async () => {
        await Database.query('DELETE FROM birdypets WHERE `member` = ?', [this.id]);
        await Database.query('DELETE FROM exchanges WHERE `memberA` = ? OR `memberB` = ?', [this.id, this.id]);
        await Database.query('DELETE FROM counters WHERE `member` = ?', [this.id]);

        resolve();
      });
    });
  }
}

module.exports = Member;
