const Bird = require('./bird.js');
const Cache = require('../helpers/cache.js');
const Counters = require('../helpers/counters.js');
const Redis = require('../helpers/redis.js');

class Illustration {
  constructor(id) {
    this.id = id;
  }

  fetch(params = {}) {
    return new Promise((resolve, reject) => {
      Cache.get('illustration', this.id).then(async (illustration) => {
        let bird = null;

        if (!params.bird) {
          bird = new Bird(illustration.speciesCode);

          await bird.fetch();

          this.bird = bird;
        } else {
          bird = params.bird;
        }

        this.prefix = illustration.prefix;
        this.alias = illustration.alias;
        this.label = illustration.label;
        this.credit = illustration.credit;
        this.source = illustration.source;
        this.special = illustration.special || false;

        this.image = `https://storage.googleapis.com/squawkoverflow/${bird.order}/${bird.family}/${bird.scientific.replace(/\s/, '%20')}/${this.id}.${illustration.filetype ? illustration.filetype : "jpg"}`;

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

module.exports = Illustration;
