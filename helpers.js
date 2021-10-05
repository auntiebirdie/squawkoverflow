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
  MemberTiers: function(member) {
    var tier = {
      name: "",
      eggTimer: 0
    };

    switch (`${member.tier}`) {
      case "3":
        tier.name = "Alpha Squad";
        tier.eggTimer = 10; // opt-in for timer
        break;
      case "2":
        tier.name = "Alpha Squad";
        tier.eggTimer = 0;
        break;
      case "1":
        tier.name = "Supporter";
        tier.eggTimer = 0;
        break;
    }

    return tier;
  },
  BirdyPets: require('./helpers/birdypets.js'),
  UserPets: {
    fetch: require('./helpers/fetchUserPets.js')
  },
  Middleware: require('./helpers/middleware.js')
}
