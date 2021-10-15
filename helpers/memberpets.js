var Redis = require('./redis.js');
var BirdyPets = require('./birdypets.js');

module.exports = {
  format: function(memberpet) {
    let birdypet = BirdyPets.fetch(memberpet.birdypetId);

    return {
      ...memberpet,
      ...birdypet,
      flocks: memberpet.flocks ? memberpet.flocks.split(',').filter((flock) => flock != "NONE") : []
    }
  },

  fetch: function(args) {
    return new Promise((resolve, reject) => {
      Redis.fetch('memberpet', args).then((memberpets) => {
        resolve(memberpets.map((memberpet) => this.format(memberpet)));
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
