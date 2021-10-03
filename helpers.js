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
  BirdyPets: require('./helpers/birdypets.js'),
  UserPets: {
    fetch: require('./helpers/fetchUserPets.js')
  },
  Middleware: require('./helpers/middleware.js')
}
