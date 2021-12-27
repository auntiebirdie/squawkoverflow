const Cache = require('../helpers/cache.js');
const Counters = require('../helpers/counters.js');

class Bird {
  constructor(id) {
    this.id = id;
  }

  fetch(params = {}) {
    return new Promise((resolve, reject) => {
      Cache.get('bird', this.id).then(async (bird) => {
        for (let key in bird) {
          if (!params.fields || params.fields.includes(key)) {
            switch (key) {
              case 'adjectives':
                try {
                  this[key] = JSON.parse(bird[key]);
                } catch (err) {
                  this[key] = [];
                }
                break;
              default:
                this[key] = bird[key];
            }
          }
        }

        if (!params.fields || params.fields.includes('illustrations')) {
          const Illustrations = require('../collections/illustrations.js');

          this.illustrations = await Illustrations.fetch('speciesCode', this.code, {
            bird: bird,
            include: params.include,
            member: params.member
          });

          this.illustrations.sort((a, b) => (a.hatched === b.hatched) ? 0 : a.hatched ? -1 : 1);
        }

        if (params.include?.includes('memberData') && params.member) {
          await this.fetchMemberData(params.member);
        }

        resolve(this);
      });
    });
  }

  fetchMemberData(memberId) {
    return new Promise(async (resolve, reject) => {
      let wishlist = await Cache.get('wishlist', memberId) || {};

      this.wishlisted = wishlist[this.family] ? wishlist[this.family].includes(this.code) : false;
      this.owned = await Counters.get('species', memberId, this.code);

      resolve({
        wishlisted: this.wishlisted,
        owned: this.owned
      });
    });
  }
}

module.exports = Bird;
