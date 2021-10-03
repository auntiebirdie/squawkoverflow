const Chance = require('chance').Chance();
const birdypets = require('../public/data/birdypets.json');

module.exports = {
  format: function(birdypet) {
    return {
      ...birdypet,
      image: `https://storage.googleapis.com/birdypets/${birdypet.species.order}/${birdypet.species.family}/${birdypet.species.scientificName}/${birdypet.id}.${birdypet.filetype ? birdypet.filetype : "jpg"}`
    }
  },
  random: function(num = 1) {
    return Chance.pickset(birdypets, num).map((birdypet) => this.format(birdypet));
  },
  fetch: function(id) {
    return this.format(birdypets.find((birdypet) => birdypet.id == id));
  },
  findBy: function(key, value) {
    var keys = key.split('.');

    return birdypets.filter((birdypet) => {
      let tmp = keys.length > 1 ? birdypet[keys[0]][keys[1]] : birdypet[key];

      return Array.isArray(tmp) ? tmp.includes(value) : tmp == value;
    }).map((birdypet) => this.format(birdypet));
  }
}
