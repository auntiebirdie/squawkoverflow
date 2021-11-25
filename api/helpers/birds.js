const birds = require('../data/birds.json');

module.exports = {
  random: function(key, value) {
    var matchingBirds = this.fetch(key, value);

    return (matchingBirds.length > 0 ? matchingBirds : this.all()).sort(() => .5 - Math.random())[0];
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
        } else {
          isMatch = false;
        }

        if (isMatch) {
          matchingBirds = [...matchingBirds, ...birds[order][family].children];

          if (key == "family") {
            break;
          }
        } else {
          for (let bird of birds[order][family].children) {
            if (bird[key] && bird[key] != "" && bird[key].length > 0) {
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
  },
  all: function() {
    var output = [];

    for (let order in birds) {
      for (let family in birds[order]) {
        output = [...output, ...birds[order][family].children];
      }
    }
    return output;
  }
}
