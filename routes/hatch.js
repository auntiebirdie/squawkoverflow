const helpers = require('../helpers');
const express = require('express');
const router = express.Router();

router.get('/', helpers.Middleware.isLoggedIn, async (req, res) => {
  var member = await helpers.Redis.get('member', req.session.user.id);
  var timeUntil = 0;

  if (member.tier) {
    if (member.lastHatchedAt) {
      var tier = helpers.MemberTiers(member);

      if (tier.eggTimer) {
        var timeSinceLastHatch = (Date.now() - member.lastHatchedAt) / 60000;

        if (timeSinceLastHatch < tier.eggTimer) {
          timeUntil = Math.floor(tier.eggTimer - timeSinceLastHatch);
        }
      }
    }
  }

  if (timeUntil == 0) {
    var eggs = helpers.data('eggs');
    var keys = helpers.Chance.pickset(Object.keys(eggs), 5);

    eggs = keys.map((egg) => {
      return {
        ...eggs[egg],
        name: egg
      }
    });

    req.session.adjectives = keys;
  } else {
    var adjectives = [];
  }

  res.render('hatch/eggs', {
    eggs: eggs,
    timeUntil: timeUntil
  });
});

module.exports = router;
