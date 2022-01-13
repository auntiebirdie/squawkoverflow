const Bird = require('./bird.js');
const Cache = require('../helpers/cache.js');
const Counters = require('../helpers/counters.js');
const Redis = require('../helpers/redis.js');

class Variant {
  constructor(id) {
    this.id = id;
  }

  fetch(params = {}) {
    return new Promise((resolve, reject) => {
      Cache.get('variant', this.id).then(async (variant) => {
        let bird = null;

        if (!params.bird) {
          bird = new Bird(variant.species);

          await bird.fetch();

          this.bird = bird;
        } else {
          bird = params.bird;
        }

        this.prefix = variant.prefix;
        this.alias = variant.alias;
        this.label = variant.label;
        this.credit = variant.credit;
        this.source = variant.source;
        this.special = variant.special || false;

        this.image = `https://storage.googleapis.com/squawkoverflow/${bird.order}/${bird.family}/${bird.scientificName.replace(/\s/g, '%20')}/${this.id}.${variant.filetype ? variant.filetype : "jpg"}`;

        if (params.include?.includes('memberData') && params.member) {
          await this.fetchMemberData(params.member);
        }

        resolve(this);
      });
    });
  }

  fetchMemberData(memberId) {
    return new Promise(async (resolve, reject) => {
      if (this.bird) {
        await this.bird.fetchMemberData(memberId);

        this.wishlisted = this.bird.wishlisted;
        this.owned = this.bird.owned;
      }

      this.hatched = await Counters.get('birdypets', memberId, this.id);

      resolve(this);
    });
  }
}

module.exports = Variant;
