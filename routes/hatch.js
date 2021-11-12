const Cache = require('../helpers/cache.js');
const Members = require('../helpers/members.js');

const helpers = require('../helpers');
const express = require('express');
const router = express.Router();

router.get('/', helpers.Middleware.isLoggedIn, async (req, res) => {
  var member = await Members.get(req.session.user.id);
  var timeUntil = 0;
  var aviaryFull = false;

  if (member.tier.eggTimer) {
    if (member.lastHatchedAt) {
      var timeSinceLastHatch = (Date.now() - member.lastHatchedAt) / 60000;

      if (timeSinceLastHatch < member.tier.eggTimer) {
        timeUntil = Math.floor(member.tier.eggTimer - timeSinceLastHatch);
      }
    }
  }

	if (member.tier.aviaryLimit < Infinity) {
		var aviary = await Cache.get('aviaryTotals', req.session.user.id);

		console.log(aviary);
	}

  if (timeUntil == 0 && !aviaryFull) {
    var eggs = helpers.data('eggs');
    var keys = helpers.Chance.pickset(Object.keys(eggs), 6);

    eggs = await Promise.all(keys.map(async (egg) => {
      let cached = await Cache.get(`eggs-${egg}`, req.session.user.id, "s");

      return {
        ...eggs[egg],
        name: egg,
        totals: [(cached.length || 0), eggs[egg].species.length]
      }
    }));

    req.session.adjectives = keys;
  } else {
    var adjectives = [];
  }

  res.render('hatch/eggs', {
    eggs: eggs,
    tier: member.tier,
    timeUntil: timeUntil,
    aviaryFull: aviaryFull
  });
});

module.exports = router;
