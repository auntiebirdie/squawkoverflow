const Database = require('../helpers/database.js');
const Cache = require('../helpers/cache.js');
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
        code: "",
        family: data.family,
        commonName: data.commonName,
        scientificName: data.scientificName
      }).then(() => {
        Database.create('variants', {
          id: Database.key(),
          species: data.scientificName,
          source: "n/a",
          credit: "n/a",
          full: 0,
          special: 0
        }).then(() => {
          resolve(this);
        });
      });
    });
  }

  set(data) {
    return new Promise(async (resolve, reject) => {
      await Database.set('species', {
        id: this.id
      }, data);

      for (let key in data) {
        await Redis.sendCommand(['HSET', `species:${this.id}`, key, data[key]]);
      }

      resolve();
    });
  }

  fetch(params = {}) {
    return new Promise((resolve, reject) => {
      const identifier = `species:${this.id}`;

      Redis.sendCommand(['HGETALL', identifier]).then(async (result) => {
        if (!result.family) {
          result = await Database.getOne('species', {
            id: this.id
          }).then(async (bird) => {
            for (let key in bird) {
              await Redis.sendCommand(['HSET', identifier, key, bird[key]]);
            }

            return bird;
          });
        }

        if (!result) {
          return reject();
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

          this.variants.sort((a, b) => {
            if (a.full != b.full) {
              return a.full ? -1 : 1;
            } else if (a.style != b.style) {
              return a.style == 1 ? -1 : 1;
            } else if (a.credit != b.credit) {
              return (a.credit || "").localeCompare(b.credit);
            } else if (a.subspecies != b.subspecies) {
              return (a.subspecies || "").localeCompare(b.subspecies);
            } else if (a.label != b.label) {
              return (a.label || "").localeCompare(b.label);
            } else {
              return 0;
            }
          });
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
