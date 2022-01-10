const Counters = require('../helpers/counters.js');
const Database = require('../helpers/database.js');

const Illustrations = require('../collections/illustrations.js');
const Member = require('../models/member.js');

module.exports = async (req, res) => {
  if (!req.body?.loggedInUser && !req.query?.loggedInUser) {
    return res.sendStatus(401);
  }

  switch (req.method) {
    case "GET":
      let member = new Member(req.query.loggedInUser);

      await member.fetch();

      var eggs = await Database.query('SELECT adjective, numSpecies FROM adjectives ORDER BY RAND() LIMIT 6');

      for (let egg in eggs) {
        eggs[egg].numHatched = member.tier?.extraInsights ? await Counters.get('eggs', member.id, egg.adjective) : 0;
      };

      return res.status(200).json(eggs);
      break;
    case "POST":
      var birdypets = [];
      var species = require('../data/eggs.json')[req.body.egg].species;

      do {
          var bird = species.sort(() => .5 - Math.random())[0];

          var illustrations = await Illustrations.fetch('speciesCode', bird).then((birdypets) => birdypets.filter((birdypet) => !birdypet.special));
      }
      while (illustrations.length == 0);

      var illustration = illustrations.sort(() => .5 - Math.random())[0];

      if (illustration) {
        await illustration.fetchMemberData(req.body.loggedInUser);

        return res.status(200).json(illustration);
      } else {
        return res.sendStatus(500);
      }
      break;
    default:
      return res.sendStatus(405);
  }
};
