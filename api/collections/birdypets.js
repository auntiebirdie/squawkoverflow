class BirdyPets {
  constructor() {
    this.model = require('../models/birdypet.js');
  }

  get(id) {
    let BirdyPet = new this.model(id);

    return BirdyPet;
  }

  findBy (key, value) {
    var birdypets = require('../data/birdypets.json');
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
    }).map((birdypet) => this.get(birdypet.id));
  }
}

module.exports = new BirdyPets;
