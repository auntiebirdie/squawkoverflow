const Bird = require('./bird.js');
const Counters = require('../helpers/counters.js');
const Database = require('../helpers/database.js');

class Variant {
  constructor(id) {
    this.id = id;
  }

  fetch(params = {}) {
    return new Promise((resolve, reject) => {
      Database.getOne('variants', { id : this.id }).then( async (variant) => {
        for (let key in variant) {
          if (!params.fields || params.fields.includes(key)) {
            this[key] = variant[key];
          }
        }

        let bird = null;

        if (!params.bird) {
          bird = new Bird(variant.species);

          await bird.fetch({ include: params.include });

          this.bird = bird;
        } else {
          bird = params.bird;
        }

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

      this.hatched = await Counters.get('variant', memberId, this.id);

      resolve(this);
    });
  }
}

module.exports = Variant;
