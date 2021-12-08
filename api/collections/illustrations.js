const Cache = require('../helpers/cache.js');

class Illustrations {
  constructor() {
    this.model = require('../models/illustration.js');
  }

  fetch(key, value, params = {}) {
    return new Promise((resolve, reject) => {
      Cache.get('illustrations', key + ':' + value, "s").then((ids) => {
        Promise.all(ids.map((id) => this.get(id, params))).then((illustrations) => {
          resolve(illustrations);
        });
      });
    });
  }

  get(id, params = {}) {
    let model = new this.model(id);

    return model.fetch(params);
  }
}

module.exports = new Illustrations;