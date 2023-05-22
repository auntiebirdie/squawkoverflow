const Cache = require('../helpers/cache.js');
const Counters = require('../helpers/counters.js');
const Database = require('../helpers/database.js');
const Redis = require('../helpers/redis.js');

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
        supporter: data.supporter || 0,
        serverMember: data.serverMember || false,
        joinedAt: new Date(),
        lastLoginAt: new Date(),
        lastActivityAt: new Date()
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
      if (!this.id) {
        resolve({});
      }

      try {
        if (typeof this.id == "string" && this.id.includes('auth') && this.id.includes('token')) {
          this.id = JSON.parse(this.id);
        }
      } catch (err) {}

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
        }).catch((err) => {
          this.id = null;

          resolve({});
        });
      }

      if (!member) {
        if (params.createIfNotExists) {
          this.create(params.data || {}).then((id) => {
            this.id = id;

            resolve({
              ...params.data,
              id: id
            });
          });
        } else {
          this.id = null;

          resolve({});
        }
      } else {
        this.id = member.id;

        resolve(member);
      }
    });
  }

  fetch(params = {}) {
    return new Promise(async (resolve, reject) => {
      var member = await this.exists(params);

      if (!member || !member.id) {
        return reject();
      }

      for (let key in member) {
        if (!params.fields || params.fields.includes(key)) {
          this[key] = member[key];
        }
      }

      if (this.avatar) {
        this.avatar = this.avatar.replace('.gif', '.png');
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

      if (!this.settings.title) {
        this.settings.title = 0;
      }

      var birthday = new Date();
      birthday.setMonth(this.settings.birthday_month);
      birthday.setDate(this.settings.birthday_date);

      this.happyBirdday = birthday <= new Date();

      if (this.happyBirdday) {
        this.birthdayPresentClaimed = await Counters.get('birthday', this.id, new Date().getYear());
      }

      if (!this.settings.theme_style) {
        this.settings.theme_style = 'dark';
      }

      if (typeof this.settings.title != "undefined") {
        if (this.settings.title == "highest") {
          try {
            this.title = await Database.query('SELECT name FROM titles WHERE id IN (SELECT title FROM member_titles WHERE member = ?) AND id BETWEEN 0 and 4 ORDER BY id DESC LIMIT 1', [this.id]).then((title) => title.name);
          } catch (err) {
            this.title = 'Birder';
          }
        } else {
          this.title = await Database.getOne('titles', {
            id: this.settings.title
          }).then((title) => title.name);
        }
      } else {
        this.title = 'Birder';
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

      let promises = [];

      for (let include of params.include || []) {
        switch (include) {
          case 'auth':
            this.auth = await Database.query('SELECT provider, id FROM member_auth WHERE `member` = ?', [this.id]);
            break;
          case 'aviary':
            this.aviary = await Cache.count(`aviary:${member.id}`, 'birdypets', {
              'member': this.id
            });
            break;
          case 'badges':
            this.badges = await Database.query('SELECT badges.* FROM badges JOIN member_badges ON (member_badges.badge = badges.id) WHERE member_badges.member = ? ORDER BY displayOrder', [this.id]);

            for (let badge of this.badges) {
              if (badge.name.includes('[COUNTER]')) {
                var total = 0;

                switch (badge.id) {
                  case 'friendship':
                    total = await Database.count('birdypets', {
                      member: this.id,
                      friendship: 100
                    });
                    break;
                }

                if (total > 1) {
                  badge.name = badge.name.replace('[COUNTER]', total);
                } else {
                  badge.name = badge.name.replace(' ([COUNTER])', '');
                }
              }
            }
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
              member: this.id,
              intensity: {
                comparator: '>',
                value: 0
              }
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
          case 'notificationCount':
            this.notificationCount = await Database.count('notifications', {
              member: this.id,
              viewed: false
            });
            break;
          case 'rank':
            var total = this.aviary ? this.aviary : await Cache.count(`aviary:${member.id}`, 'birdypets', {
              'member': this.id
            });

            this.ranks = require('../data/ranks.json').map((rank) => {
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
          case 'titles':
            this.titles = await Database.query(`
              SELECT titles.*, IF(\`member\` IS NULL AND id > 0, 1, 0) disabled
              FROM titles
              LEFT JOIN member_titles ON (member_titles.title = titles.id AND member_titles.member = ?)
              WHERE (id BETWEEN 0 AND 4) OR (\`member\` = ? AND id > 4)
	      ORDER BY id DESC
            `, [this.id, this.id]);

            this.titles = this.titles.map((title) => {
              let percentage = 0;
              let label = title.name;

              switch (title.id) {
                case 4:
                  label += " (100% species)";
                  break;
                case 3:
                  label += " (75% species)";
                  break;
                case 2:
                  label += " (50% species)";
                  break;
                case 1:
                  label += " (25% species)";
                  break;
              }

              return {
                id: title.id,
                label: label,
                selected: (this.settings.title || 'highest') == title.id,
                disabled: title.disabled
              }
            });

            this.titles.push({
              id: "highest",
              label: "(highest available)",
              selected: this.settings.title == "highest",
              disabled: 0
            });

            break;
          case 'totals':
            this.totals = {
              aviary: this.aviary ? this.aviary : await Cache.count(`aviary:${member.id}`, 'birdypets', {
                'member': this.id
              }),
              species: [
                await Database.count('member_unlocks JOIN species ON (member_unlocks.species = species.id)', {
                  member: member.id
                }),
                await Cache.count('species', 'species', {})
              ]
            };
            break;
          case 'warnings':
            this.warnings = await Database.getOne('member_warnings', {
              member: this.id,
              acknowledgedAt: {
                comparator: 'IS',
                value_trusted: 'NULL'
              }
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

  delete() {
    return new Promise((resolve, reject) => {
      let promises = [];

      promises.push(Database.query('DELETE FROM member_auth WHERE `member` = ?', [this.id]));
      promises.push(Database.query('DELETE FROM members WHERE id = ?', [this.id]));
      promises.push(Database.query('DELETE FROM member_settings WHERE `member` = ?', [this.id]));
      promises.push(Database.query('DELETE FROM member_variants WHERE `member` = ?', [this.id]));
      promises.push(Database.query('DELETE FROM member_titles WHERE `member` = ?', [this.id]));
      promises.push(Database.query('DELETE FROM birdypet_flocks WHERE birdypet IN (SELECT id FROM birdypets WHERE `member` = ?) OR flock IN (SELECT id FROM flocks WHERE `member` = ?)', [this.id, this.id]));
      promises.push(Database.query('DELETE FROM flocks WHERE `member` = ?', [this.id]));
      promises.push(Database.query('DELETE FROM exchange_birdypets WHERE exchange IN (SELECT id FROM exchanges WHERE `memberA` = ? OR `memberB` = ?)', [this.id, this.id]));
      promises.push(Database.query('DELETE FROM wishlist WHERE `member` = ?', [this.id]));
      promises.push(Database.query('DELETE FROM notifications WHERE `member` = ?', [this.id]));

      Promise.all(promises).then(async () => {
        await Database.query('UPDATE birdypets SET `member` = NULL, friendship = 0 WHERE `member` = ?', [this.id]);
        await Database.query('DELETE FROM exchanges WHERE `memberA` = ? OR `memberB` = ?', [this.id, this.id]);
        await Database.query('DELETE FROM counters WHERE `member` = ?', [this.id]);

        resolve();
      });
    });
  }
}

module.exports = Member;