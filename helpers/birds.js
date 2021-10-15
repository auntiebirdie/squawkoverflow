const Chance = require('chance').Chance();
const birds = require('../public/data/birds.json');

module.exports = {
  random: function(key, value) {
    var matchingBirds = this.fetch(key, value);

    return matchingBirds.length > 0 ? Chance.pickone(matchingBirds) : Chance.pickone(this.fetch());
  },
  fetch: function(key, value) {
    var matchingBirds = [];
    value = value ? value.toLowerCase() : "";

    for (let order in birds) {
      var isMatch = !key;

      if (key == "order") {
        isMatch = value == order.toLowerCase();
      }

      for (let family in birds[order]) {
        if (key == "family") {
          isMatch = value == family.toLowerCase();
        }

        if (isMatch) {
          matchingBirds = [...matchingBirds, ...birds[order][family].children];

          if (key == "family") {
            break;
          }
        } else {
          for (let bird of birds[order][family].children) {
            if (bird[key]) {
              isMatch = Array.isArray(bird[key]) ? bird[key].map((val) => val.toLowerCase()).includes(value) : bird[key].toLowerCase() == value;

              if (isMatch) {
                matchingBirds.push(bird);
              }
            }
          }
        }
      }

      if (isMatch && key == "order") {
        break;
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
  },
  data: {
    orders: function() {
      var output = [];

      for (let order in birds) {
        output.push(order);
      }

      return output;
    },
    families: function(inOrder) {
      var output = [];

      for (let order in birds) {
        if (!inOrder || order == inOrder) {
          for (let family in birds[order]) {
            output.push(family);
          }

          if (inOrder) {
            break;
          }
        }
      }

      return output;
    }
  }
}
