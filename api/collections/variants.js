const Cache = require('../helpers/cache.js');

class Variants {
  constructor() {
    this.model = require('../models/variant.js');
  }

  fetch(key, value, params = {}) {
    return new Promise((resolve, reject) => {
      Cache.get('variants', key + ':' + value).then((ids) => {
        Promise.all(ids.map((id) => this.get(id, params))).then((variants) => {
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
