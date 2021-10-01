const Chance = require('chance').Chance();
const birdypets = require('./public/data/birdypets.json');

module.exports = {
  sanitize: function(input) {
    return input.replace(/[&<>'"]/g,
      tag => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        "'": '&#39;',
        '"': '&quot;'
      } [tag]));
  },
  data: function(file) {
    return require(`./public/data/${file}.json`);
  },
  Chance: Chance,
  DB: require('./helpers/database.js'),
  Redis: require('./helpers/redis.js'),
  Discord: {
    Webhook: require('./helpers/webhook.js')
  },
  BirdyPets: {
    random: function(num = 1) {
      return Chance.pickset(birdypets, num);
    },
    fetch: function(id) {
      return birdypets.find((birdypet) => birdypet.id == id);
    },
    findBy: function(key, value) {
      var keys = key.split('.');

      return birdypets.filter((birdypet) => {
        let tmp = keys.length > 1 ? birdypet[keys[0]][keys[1]] : birdypet[key];

        return Array.isArray(tmp) ? tmp.includes(value) : tmp == value;
      });
    }
  },
  UserPets: {
	  fetch: require('./helpers/fetchUserPets.js')
  },
  Middleware: require('./helpers/middleware.js')
}
