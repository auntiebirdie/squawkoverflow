const birds = require('../data/birds.json');

class Birds {
  constructor() {
//    this.model = require('../models/bird.js');
  }

  findBy(key, value) {
    for (var bird of birds) {
      if (bird[key].toLowerCase() == value.toLowerCase()) {
        return bird;
      }
    }

    return {};
  }

  fetch(key, value) {
    let matchingBirds = [];

    value = value ? value.toLowerCase() : "";

    for (let bird of birds) {
      if (bird[key] && bird[key] != "" && bird[key].length > 0) {
        let isMatch = Array.isArray(bird[key]) ? bird[key].map((val) => val.toLowerCase()).includes(value) : bird[key].toLowerCase() == value;

        if (isMatch) {
          matchingBirds.push(bird);
        }
      }
    }

    return matchingBirds;
  }

  random(key, value) {
    var matchingBirds = this.fetch(key, value);

    return (matchingBirds.length > 0 ? matchingBirds : this.all()).sort(() => .5 - Math.random())[0];
  }

  all() {
    return birds;
  }
}

module.exports = new Birds;
