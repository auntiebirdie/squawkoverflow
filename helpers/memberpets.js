const BirdyPets = require('./birdypets.js');
const Redis = require('./redis.js');

module.exports = {
  format: function(memberpet) {
    let birdypet = BirdyPets.get(memberpet.birdypetId);

    return {
      ...memberpet,
      ...birdypet,
      flocks: memberpet.flocks ? memberpet.flocks.split(',').filter((flock) => flock != "NONE") : []
    }
  },

  fetch: function(args) {
    return new Promise((resolve, reject) => {
      Redis.fetch('memberpet', args).then((memberpets) => {
        resolve(memberpets.results.map((memberpet) => this.format(memberpet)));
      });
    });
  },

  get: function(id) {
    return new Promise((resolve, reject) => {
      Redis.get('memberpet', id).then((memberpet) => {
        resolve(this.format(memberpet));
      });
    });
  }
}
