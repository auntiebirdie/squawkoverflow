const Database = require('../helpers/database.js');
const Cache = require('../helpers/cache.js');
const Counters = require('../helpers/counters.js');

class Bird {
  constructor(id) {
    this.id = id;
  }

  fetch(params = {}) {
    return new Promise((resolve, reject) => {
      Database.getOne('species', {
        code: this.id
      }).then(async (bird) => {
        for (let key in bird) {
          if (!params.fields || params.fields.includes(key)) {
            this[key] = bird[key];
          }
        }

        await Database.getOne('taxonomy', {
          name: bird.family
        }, {
          select: ['name', 'parent']
        }).then((taxonomy) => {
          this.family = taxonomy.name;
          this.order = taxonomy.parent;
        });

        if (params.include?.includes('variants')) {
          const Variants = require('../collections/variants.js');

          this.variants = await Variants.fetch('species', this.code, {
            bird: this,
            include: params.include,
            member: params.member,
	    artist: params.artist
          });

          this.variants.sort((a, b) => (a.hatched === b.hatched) ? 0 : a.hatched ? -1 : 1);
        }

        if (params.include?.includes('adjectives')) {
          this.adjectives = await Database.get('species_adjectives', {
            species: this.id
          }, {
            select: ['adjective']
          }).then((results) => results.map((result) => result.adjective));
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
      this.wishlisted = await Database.getOne('wishlist', { member : memberId, species: this.id }).then( (wishlist) => wishlist ? wishlist.intensity : 0);
      this.owned = await Counters.get('species', memberId, this.id);

      resolve({
        wishlisted: this.wishlisted,
        owned: this.owned
      });
    });
  }
}

module.exports = Bird;
