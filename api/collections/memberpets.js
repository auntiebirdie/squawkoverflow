const Hash = require('object-hash');

class MemberPets {
  constructor({
    member,
    family,
    flock,
    search,
	  sort,
    page
  }) {
    var page = (--page || 0) * birdsPerPage;

    var filters = [
      ['member', '=', member]
    ];

    if (family) {
      filters.push(['family', '=', family]);
    }

    if (flock) {
      var totals = await Cache.get('aviaryTotals', member);
      filters.push(['flocks', '=', null]);
    } else {
      var totals = await Cache.get('flockTotals', flock ? flock : `NONE-${member}`);
      filters.push(['flocks', '=', flock]);
    }

        Redis.connect("cache").smembers(`search:${Hash(filters)}`, (err, results) => {
      if (err || typeof results == 'undefined' || results == null || results.length == 0) {
        resolve(this.refresh(kind, id));
      } else {
        resolve(results);
      }
    });
  await Database.fetch({
	  kind: 'MemberPet',
	  filters: filters
  }
	  'memberpet', {
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
}
}

module.exports = new MemberPets;
