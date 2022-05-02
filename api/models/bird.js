const Database = require('../helpers/database.js');
const Counters = require('../helpers/counters.js');
const Redis = require('../helpers/redis.js');

class Bird {
  constructor(id) {
    this.id = id?.replace(/\-/g, ' ');
  }

  create(data) {
    return new Promise(async (resolve, reject) => {
      this.id = data.scientificName;
      this.family = data.family;
      this.commonName = data.commonName;
      this.scientificName = data.scientificName;

      Database.create('species', {
        id: data.scientificName,
        code: Date.now(),
        family: data.family,
        commonName: data.commonName,
        scientificName: data.scientificName
      }).then(async () => {
        resolve(this);
      });
    });
  }

  fetch(params = {}) {
    return new Promise((resolve, reject) => {

      const identifier = `species:${this.id}`;

      Redis.hgetall(identifier, async (err, result) => {
        if (!result) {
          result = await Database.getOne('species', {
            id: this.id
          }).then(async (bird) => {
            for (let key in bird) {
              await Redis.hset(identifier, key, bird[key]);
            }

            return bird;
          });
        }

        for (let key in result) {
          if (!params.fields || params.fields.includes(key)) {
            this[key] = result[key];
          }
        }

        this.id_slug = this.id.replace(/\s/g, '-');

        await Database.getOne('taxonomy', {
          name: this.family
        }, {
          select: ['name', 'parent']
        }).then((taxonomy) => {
          this.family = taxonomy.name;
          this.order = taxonomy.parent;
        });

        if (params.include?.includes('variants')) {
          const Variants = require('../collections/variants.js');

          this.variants = await Variants.fetch('species', this.id, {
            bird: this,
            include: params.include,
            member: params.member,
            artist: params.artist
          });

          this.variants.sort((a, b) => ((a.full ? -1 : 1) || (a.subspecies || "").localeCompare(b.subspecies) || (a.label || "").localeCompare(b.label) || (a.credit || "").localeCompare(b.credit)));
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
      this.wishlisted = await Database.getOne('wishlist', {
        member: memberId,
        species: this.id
      }).then((wishlist) => wishlist ? wishlist.intensity : 0);
      this.owned = await Counters.get('species', memberId, this.id);
      this.discovered = await Counters.get('birdypedia', memberId, this.id);

      resolve({
        wishlisted: this.wishlisted,
        owned: this.owned
      });
    });
  }
}

module.exports = Bird;