const Chance = require('chance').Chance();

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
    var data = require(`./public/data/${file}.json`);

    return Array.isArray(data) ? [...data] : Object.assign({}, data);
  1},
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
        tier.name = "Owlpha Squad";
        tier.eggTimer = 10; // opt-in for timer
        break;
      case "2":
        tier.name = "Owllpha Squad";
        tier.eggTimer = 0;
        break;
      case "1":
        tier.name = "Supporter";
        tier.eggTimer = 0;
        break;
    }

    return tier;
  },
  Birds: require('./helpers/birds.js'),
  BirdyPets: require('./helpers/birdypets.js'),
  MemberPets: require('./helpers/memberpets.js'),
  Middleware: require('./helpers/middleware.js')
}
