const Chance = require('chance').Chance();
const birds = require('../public/data/birds.json');

module.exports = {
  random: function(taxonomy) {
    var matchingBirds = this.fetch(taxonomy);

    return matchingBirds.length > 0 ? Chance.pickone(matchingBirds) : Chance.pickone(this.fetch());
  },
  fetch: function(taxonomy) {
    var matchingBirds = [];

    for (let order in birds) {
      var isOrderMatch = true;
      var isFamilyMatch = true;

      if (taxonomy) {
        if (taxonomy.toLowerCase() == order.toLowerCase()) {
          isOrderMatch = true;
        } else {
          isOrderMatch = false;
        }
      }

      for (let family in birds[order]) {
        if (taxonomy) {
          if (isOrderMatch || taxonomy.toLowerCase() == family.toLowerCase()) {
            isFamilyMatch = true;
          } else {
            isFamilyMatch = false;
          }
        }

        if (isOrderMatch || isFamilyMatch) {
          matchingBirds = [...matchingBirds, ...birds[order][family].children];
        }

      }
    }
    return matchingBirds;
  },
  findBy: function(key, value) {
    for (var order in birds) {
      for (var family in birds[order]) {
        for (var species of birds[order][family].children) {
          if (species[key].toLowerCase() == value.toLowerCase()) {
            return species;
          }
        }
      }
    }

    return {};
  }
}
