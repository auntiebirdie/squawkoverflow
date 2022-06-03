const Counters = require('../helpers/counters.js');
const Database = require('../helpers/database.js');

const Bird = require('../models/bird.js');
const Member = require('../models/member.js');

const chance = require('chance').Chance();

module.exports = async (req, res) => {
  if (!req.body?.loggedInUser && !req.query?.loggedInUser) {
    return res.error(401);
  }

  var eventEggs = await Database.query('SELECT adjective FROM events JOIN event_variants ON (events.id = event_variants.event) JOIN variants ON (event_variants.variant = variants.id) JOIN species_adjectives ON (variants.species = species_adjectives.species) WHERE NOW() BETWEEN events.startDate AND events.endDate').then((results) => results.map((result) => result.adjective));

  switch (req.method) {
    case "GET":
      var member = new Member(req.query.loggedInUser);

      await member.fetch({
        include: ['totals']
      });

      if (member.tier.aviaryLimit && member.totals.aviary >= member.tier.aviaryLimit) {
        return res.error(403, {
          aviaryFull: true
        });
      } else {
        let timeUntil = member.tier.eggTimer ? (Date.now() - new Date(member.lastHatchAt).getTime()) / 60000 : 0;

        if (timeUntil < member.tier.eggTimer) {
          return res.error(403, {
            timeUntil: member.tier.eggTimer - timeUntil
          });
        } else {
          var query = 'SELECT adjective, numSpecies, icon FROM adjectives';
          var params = [];

          if (member.settings.general_removeCompleted) {
            query += ' WHERE adjective NOT IN (SELECT id FROM counters WHERE counters.id = adjectives.adjective AND counters.member = ? AND counters.count = adjectives.numSpecies';
            params.push(member.id);

            if (eventEggs.length > 0 && !member.settings.general_removeEvent) {
              query += ' AND counters.id NOT IN (?)';
              params.push(eventEggs);
            };

            query += ')';
          }

          query += ' ORDER BY RAND() LIMIT 6';

          var eggs = await Database.query(query, params);

          for (let egg of eggs) {
            egg.isEvent = eventEggs.includes(egg.adjective) && !member.settings.general_removeEvent;

            if (egg.isEvent) {
              egg.icon = 'eggs/special/easter.png';
            }

            if (member.tier?.extraInsights) {
              egg.numHatched = await Counters.get('eggs', member.id, egg.adjective);
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

      let timeUntil = member.tier.eggTimer ? (Date.now() - new Date(member.lastHatchAt).getTime()) / 60000 : 0;

      if (timeUntil < member.tier.eggTimer) {
        timeUntil = member.tier.eggTimer - timeUntil;

        return res.error(403, 'You can hatch another egg in ' + (timeUntil < 1 ? (Math.round(timeUntil * 60) + ' second' + (Math.round(timeUntil * 60) != 1 ? 's' : '')) : (Math.round(timeUntil) + ' minute' + (Math.round(timeUntil) != 1 ? 's' : ''))) + '.');
      } else {
        var isEventEgg = eventEggs.includes(req.body.egg) && chance.bool() && !member.settings.general_removeEvent;

        if (isEventEgg) {
          var hatched = await Database.query('SELECT variants.species, variants.id FROM event_variants JOIN events ON (event_variants.event = events.id) JOIN variants ON (event_variants.variant = variants.id) JOIN species_adjectives ON (variants.species = species_adjectives.species) WHERE adjective = ? AND NOW() BETWEEN events.startDate AND events.endDate ORDER BY RAND() LIMIT 1', [req.body.egg]);
        } else {
          var hatched = await Database.query('SELECT species FROM species_adjectives WHERE adjective = ? AND species IN (SELECT species FROM variants) ORDER BY RAND() LIMIT 1', [req.body.egg]);
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
