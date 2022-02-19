const Database = require('../helpers/database.js');

class Variants {
  constructor() {
    this.model = require('../models/variant.js');
  }

  fetch(key, value, params = {}) {
    return new Promise((resolve, reject) => {
      let filters = [];

      if (key == 'prefix-alias') {
        filters.prefix = value.split('-').shift();
        filters.alias = value.split('-').pop();
      } else {
        filters[key] = value;
      }

	    if (params.artist) {
		    filters['credit'] = params.artist;
	    }

      Database.get('variants', filters, {
        select: ['id']
      }).then((variants) => {
        Promise.all(variants.map((variant) => this.get(variant.id, params))).then((variants) => {
          resolve(variants);
        });
      });
    });
  }

  get(id, params = {}) {
    let model = new this.model(id);

    return model.fetch(params);
  }
}

module.exports = new Variants;
