const fs = require('fs');

var output = [];

const birds = require('../../public/data/birds.json');

for (var order in birds) {
  for (var family in birds[order]) {
    output.push({
      value: family,
      label: birds[order][family].display
    });
  }
}

fs.writeFileSync(__dirname + '/../../public/data/families.json', JSON.stringify(output.sort((a, b) => a.value.localeCompare(b.value)), null, 2));