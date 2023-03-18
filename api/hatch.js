const Counters = require('../helpers/counters.js');
const Database = require('../helpers/database.js');

const Bird = require('../models/bird.js');
const Member = require('../models/member.js');

const chance = require('chance').Chance();

module.exports = async (req, res) => {
  if (!req.body?.loggedInUser && !req.query?.loggedInUser) {
    return res.error(401);
  }

	var isEvent = await Database.query('SELECT id FROM events WHERE NOW() BETWEEN events.startDate AND events.endDate LIMIT 1');

  if (isEvent) {
    var eventEggs = await Database.query('SELECT adjectives.* FROM events JOIN event_variants ON (events.id = event_variants.event) JOIN variants ON (event_variants.variant = variants.id) JOIN species_adjectives ON (variants.species = species_adjectives.species) JOIN adjectives ON (adjectives.adjective = species_adjectives.adjective) WHERE NOW() BETWEEN events.startDate AND events.endDate ORDER BY RAND()');
  } else {
    eventEggs = [];
  }


  switch (req.method) {
    case "GET":
      var member = new Member(req.query.loggedInUser);

      await member.fetch({
        include: ['totals']
      });

      if (!member.supporter && member.totals.aviary >= 12000) {
        return res.error(403, {
          aviaryFull: true
        });
      } else {
        let timeUntil = (Date.now() - new Date(member.lastHatchAt).getTime()) / 60000;

        if (!member.supporter && timeUntil < 10) {
          return res.error(403, {
            timeUntil: 10 - timeUntil
          });
        } else {
          var query = 'SELECT adjective, numSpecies, icon FROM adjectives WHERE icon NOT LIKE "eggs/special/%"';
          var params = [];

          if (member.settings.general_removeCompleted) {
            query += ' AND adjective NOT IN (SELECT id FROM counters WHERE counters.id = adjectives.adjective AND counters.member = ? AND counters.count = adjectives.numSpecies)';
            params.push(member.id);
          }

          query += ' ORDER BY RAND() LIMIT 6';

          var eggs = await Database.query(query, params);

          if (isEvent && !member.settings.general_removeEvent && chance.bool({
              likelihood: 40
            })) {

            eggs[0] = eventEggs.pop();
            eggs = chance.shuffle(eggs);
          }

          for (let egg of eggs) {
            egg.isEvent = eventEggs.find((eventEgg) => egg.adjective == eventEgg.adjective) && !member.settings.general_removeEvent;

            if (egg.isEvent) {
              egg.icon = `eggs/special/${isEvent.id}.png`;
            }

            if (member.supporter) {
              egg.numHatched = await Counters.get('eggs', member.id, egg.adjective);
              egg.numHatched = Math.min(egg.numHatched, egg.numSpecies);
            }

            egg.isNeeded = await Database.count('wishlist', {
              member: member.id,
              intensity: 2,
              species: {
                comparator: 'IN',
                value_trusted: '(SELECT species FROM species_adjectives WHERE adjective = ?)',
                value: egg.adjective
              }
            });

            if (egg.isNeeded == 0) {
              egg.isWanted = await Database.count('wishlist', {
                member: member.id,
                intensity: 1,
                species: {
                  comparator: 'IN',
                  value_trusted: '(SELECT species FROM species_adjectives WHERE adjective = ?)',
                  value: egg.adjective
                }
              });
            }
          }

          return res.json(eggs);
        }
      }
      break;
    case "POST":
      var birdypets = [];
      var member = new Member(req.body.loggedInUser);

      await member.fetch();

      let timeUntil = (Date.now() - new Date(member.lastHatchAt).getTime()) / 60000;

      if (!member.supporter && timeUntil < 10) {
        timeUntil = 10 - timeUntil;

        return res.error(403, 'You can hatch another egg in ' + (timeUntil < 1 ? (Math.round(timeUntil * 60) + ' second' + (Math.round(timeUntil * 60) != 1 ? 's' : '')) : (Math.round(timeUntil) + ' minute' + (Math.round(timeUntil) != 1 ? 's' : ''))) + '.');
      } else {
        var isEventEgg = eventEggs.find((egg) => egg.adjective == req.body.egg) && chance.bool() && !member.settings.general_removeEvent;

        if (isEventEgg) {
          var hatched = await Database.query('SELECT variants.species, variants.id FROM event_variants JOIN events ON (event_variants.event = events.id) JOIN variants ON (event_variants.variant = variants.id) JOIN species_adjectives ON (variants.species = species_adjectives.species) WHERE adjective = ? AND NOW() BETWEEN events.startDate AND events.endDate ORDER BY RAND() LIMIT 1', [req.body.egg]);
        } else {
          var hatched = await Database.query('SELECT variants.species, variants.id FROM species_adjectives JOIN variants ON (species_adjectives.species = variants.species) WHERE adjective = ? ORDER BY RAND() LIMIT 1', [req.body.egg]);
        }

        if (hatched) {
          var bird = new Bird(hatched.species);

          await bird.fetch({
            member: member.id,
            include: ['memberData', 'variants']
          });

          bird.variants = bird.variants.filter((variant) => isEventEgg ? variant.id == hatched.id : !variant.special);

          return res.json(bird);
        } else {
          return res.error(404);
        }
      }
      break;
    default:
      return res.error(405);
  }
};
