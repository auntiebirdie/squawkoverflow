const BirdyPet = require('./birdypet.js');
const Database = require('../helpers/database.js');
const Member = require('./member.js');

class Exchange {
  constructor(id) {
    this.id = id;
  }

  create(data) {
    return new Promise((resolve, reject) => {
      Database.create('exchanges', {
        id: Database.key(),
        memberA: data.memberA,
        memberB: data.memberB
      }).then((id) => {
        this.id = id;

        resolve();
      });
    });
  }

  fetch(params = {}) {
    return new Promise((resolve, reject) => {
      Database.getOne('exchanges', {
        id: this.id
      }).then(async (exchange) => {
        if (!exchange) {
          resolve(null);
        } else {
          let promises = [];

          for (let key in exchange) {
            this[key] = exchange[key];
          }

          let state = `${this.statusA}${this.statusB}`;

          if (this.memberA == params.loggedInUser) {
            this.member = new Member(this.memberB);
            this.mutable = state == '00' || state == '11' || state == '12';
          } else if (this.memberB == params.loggedInUser) {
            this.member = new Member(this.memberA);
            this.mutable = state == '10' || state == '21' || state == '20';
          } else {
            return reject(null);
          }

          let latestLog = await Database.getOne('exchange_logs', {
            exchange: this.id
          }, {
            order: 'loggedAt DESC'
          })

          if (latestLog?.log == 'The offer was accepted by both parties!') {
            this.state = 'Completed!';
          } else {
            switch (state) {
              case '22':
                this.state = 'Completed!';
                break;
              case '11':
              case '12':
                this.state = `Pending (waiting on ${this.memberA == params.loggedInUser ? "me" : "them"})`;
                break;
              case '10':
                this.state = this.memberA == params.loggedInUser ? 'Pending (waiting on them)' : 'New!';
                break;
              case '00':
                this.state = 'Not sent';
                break;
              case '-12':
              case '-11':
              case '-10':
                this.state = 'Rescinded';
                break;
              case '2-1':
              case '1-1':
              case '0-1':
                this.state = 'Declined';
                break;
              default:
                this.state = `Pending (waiting on ${this.memberA == params.loggedInUser ? "them" : "me"})`;
                break;
            }
          }

          await this.member.fetch();

          let birdypets = await Database.query('SELECT id FROM birdypets JOIN exchange_birdypets ON (birdypets.id = exchange_birdypets.birdypet) WHERE exchange = ? AND `member` IN (?)', [exchange.id, [this.memberA, this.memberB]]);

          this.birdypetsA = [];
          this.birdypetsB = [];

          for (let i = 0, len = birdypets.length; i < len; i++) {
            let birdypet = new BirdyPet(birdypets[i].id);

            await birdypet.fetch({
              include: ['memberData'],
              member: birdypet.member == this.memberA ? this.memberB : this.memberA
            });

            this[birdypet.member == this.memberA ? 'birdypetsA' : 'birdypetsB'].push(birdypet);
          }

          if (params.include?.includes('logs')) {
            this.logs = await Database.query('SELECT log, loggedAt FROM exchange_logs WHERE exchange = ? ORDER BY loggedAt DESC LIMIT 25', [this.id]);
          }

          resolve(this);
        }
      });
    });
  }

  set(data = {}) {
    return new Promise(async (resolve, reject) => {
      data.updatedAt = new Date();

      await Database.set('exchanges', {
        id: this.id
      }, data);

      resolve();
    });
  }

  delete(member) {
    return new Promise(async (resolve, reject) => {
      let latestLog = await Database.getOne('exchange_logs', {
        exchange: this.id
      }, {
        order: 'loggedAt DESC'
      })

      let completed = latestLog?.log == 'The offer was accepted by both parties!';

      if (this.memberA == member) {
        this.set({
          statusA: -1
        }).then(() => {
          if (!completed) {
            Database.query('INSERT INTO exchange_logs VALUES (?, ?, NOW())', [this.id, 'The offer was rescinded.']).then(resolve);
          }

          resolve();
        });
      } else if (this.memberB == member) {
        this.set({
          statusB: -1
        }).then(() => {
          if (!completed) {
            Database.query('INSERT INTO exchange_logs VALUES (?, ?, NOW())', [this.id, 'The offer was declined.']).then(resolve);
          }

          resolve();
        });
      } else {
        reject();
      }
    });
  }
}

module.exports = Exchange;