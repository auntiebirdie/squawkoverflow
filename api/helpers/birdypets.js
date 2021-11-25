const Birds = require('./birds.js');
const birdypets = require('../data/birdypets.json');

module.exports = {
  format: function(birdypet) {
    if (birdypet) {
      var bird = Birds.findBy('speciesCode', birdypet.speciesCode);

      return {
        ...birdypet,
        species: {
          ...bird
        },
        image: `https://storage.googleapis.com/birdypets/${bird.order}/${bird.family}/${bird.scientificName.replace(/\s/, '%20')}/${birdypet.id}.${birdypet.filetype ? birdypet.filetype : "jpg"}`
      }
    } else {
      return null;
    }
  },
  random: function(num = 1) {
    return birdypets.filter( (birdypet) => !birdypet.special ).sort(() => .5 - Math.random()).slice(0, num).map((birdypet) => this.format(birdypet));
  },
  get: function(id) {
    return this.format(birdypets.find((birdypet) => birdypet.id == id));
  },
  findBy: function(key, value) {
    var keys = key.split('.');

    return birdypets.filter((birdypet) => {
      let tmp = `${keys.length > 1 ? birdypet[keys[0]][keys[1]] : birdypet[key]}`;

      if (key == 'prefix-alias') {
        return `${birdypet.prefix}-${birdypet.alias}` == value;
      } else if (tmp != "undefined") {
        return Array.isArray(tmp) ? tmp.map((val) => val.toLowerCase()).includes(value.toLowerCase()) : tmp.toLowerCase() == value.toLowerCase();
      } else {
        return false;
      }
    }).map((birdypet) => this.format(birdypet));
  }
}
