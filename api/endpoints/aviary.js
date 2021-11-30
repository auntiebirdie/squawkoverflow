const Redis = require('../helpers/redis.js');
const Cache = require('../helpers/cache.js');
const MemberPet = require('../models/memberpet.js');

var birdsPerPage = 24;

module.exports = async (req, res) => {
  var page = (--req.query.page || 0) * birdsPerPage;
  var filters = [
    `@member:{${req.query.member}}`,
    req.query.family ? `@family:${req.query.family}` : '',
    req.query.flock ? `@flocks:{${req.query.flock}}` : '',
    req.query.search ? `@nickname|species:${Redis.escape(req.query.search)}` : ''
  ].join(' ');

  var totals = req.query.flock ? await Cache.get('flockTotals', (req.query.flock == 'NONE' ? `NONE-${req.query.member}` : req.query.flock)) : await Cache.get('aviaryTotals', req.query.member);

  await Redis.fetch('memberpet', {
    'FILTER': filters,
    'SORTBY': req.query.sort ? JSON.parse(req.query.sort) : null,
    'LIMIT': [page, birdsPerPage]
  }).then(async (response) => {
    var output = [];

    for (var result of response.results) {
      let memberpet = new MemberPet(result._id);

      await memberpet.fetch({
        include: req.query.loggedInUser ? ['memberData'] : null,
        member: req.query.memberData ? req.query.memberData : req.query.loggedInUser
      });

      output.push(memberpet);
    }

    res.json({
      totalPages: Math.ceil(response.count / birdsPerPage),
      families: Object.keys(totals).filter((key) => totals[key] > 0 && !key.startsWith('_')),
      results: output
    });
  });
};
