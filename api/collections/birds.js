const birds = require('../data/birds.json');

module.exports = {
  random: function(key, value) {
    var matchingBirds = this.fetch(key, value);

    return (matchingBirds.length > 0 ? matchingBirds : this.all()).sort(() => .5 - Math.random())[0];
  },
  fetch: function(key, value) {
    var matchingBirds = [];
    value = value ? value.toLowerCase() : "";

    for (let bird of birds) {
            if (bird[key] && bird[key] != "" && bird[key].length > 0) {
              isMatch = Array.isArray(bird[key]) ? bird[key].map((val) => val.toLowerCase()).includes(value) : bird[key].toLowerCase() == value;

              if (isMatch) {
                matchingBirds.push(bird);
              }
            }
    }

    return matchingBirds;
  },
  findBy: function(key, value) {
    for (var bird of birds) {
          if (bird[key].toLowerCase() == value.toLowerCase()) {
            return bird;
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
