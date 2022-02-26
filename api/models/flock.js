const Database = require('../helpers/database.js');

class Flock {
  static schema = {
    name: String,
    description: String,
    displayOrder: Number,
    protected: Boolean,
    private: Boolean
  }

  constructor(id) {
    this.id = id;
  }

  create(data) {
    return new Promise((resolve, reject) => {
      Database.create('flocks', {
        id: Database.key(),
        name: data.name || "",
        description: data.description || "",
        displayOrder: 100,
        member: data.member
      }).then((id) => {
        this.id = id;

        resolve();
      });
    });
  }

  fetch(params = {}) {
    return new Promise((resolve, reject) => {
      Database.getOne('flocks', {
        id: this.id
      }).then(async (flock) => {
        if (!flock) {
          resolve(null);
        } else {
          for (let key in flock) {
            if (!params.fields || params.fields.includes(key)) {
              this[key] = flock[key];
            }
          }

          this.descriptionHTML = this.description.replace(/\</g, '&lt;').replace(/\>g/, '&gt;').replace(/(\bhttps?:\/\/(www.)?(twitter|instagram|youtube|youtu.be|tumblr|facebook)[-A-Z0-9+&@#\/%?=~_|!:,.;]*[-A-Z0-9+&@#\/%=~_|])/gim, '<a href="$1" target="_blank">$1</a>');

          for (let include of params.include || []) {
            switch (include) {
              case 'families':
                this.families = await Database.query(`
                  SELECT DISTINCT species.family
                  FROM birdypets
                  JOIN variants ON (birdypets.variant = variants.id)
                  JOIN species ON (variants.species = species.code)
                  JOIN birdypet_flocks ON (birdypets.id = birdypet_flocks.birdypet)
                  WHERE birdypet_flocks.flock = ?
                  `, [this.id]).then((results) => results.map((result) => result.family));
                break;
              case 'totals':
                this.totals = {
                  birdypets: await Database.count('birdypet_flocks', {
                    flock: this.id
                  })
                };
                break;
            }
          }

          resolve(this);
        }
      });
    });
  }

  set(data = {}) {
    return new Promise(async (resolve, reject) => {
      for (let key in data) {
        if (typeof this.constructor.schema[key] == "undefined" || typeof data[key] == "undefined") {
          delete data[key];
        }
      }

      await Database.set('flocks', {
        id: this.id
      }, data);

      resolve();
    });
  }

  delete() {
    return new Promise((resolve, reject) => {
      Database.delete('flocks', {
        id: this.id
      }).then(() => {

        resolve();
      });
    });
  }
}

module.exports = Flock;
