const BirdyPets = require('../collections/birdypets.js');
const Cache = require('../helpers/cache.js');
const Counters = require('../helpers/counters.js');
const Member = require('../models/member.js');
const Search = require('../helpers/search.js');

module.exports = async (req, res) => {
  let member = new Member(req.body?.loggedInUser || req.query?.id);

  switch (req.method) {
    case "HEAD":
      let families = await Cache.get('wishlist', req.query.id).then( (results) => {
	      return Object.keys(results);
      });

      res.setHeader('SQUAWK', JSON.stringify(families));

      return res.sendStatus(200);
      break;
    case "GET":
      let page = (--req.query.page || 0) * birdsPerPage;

      let birds = await member.fetchWishlist(req.query.family);

      let output = [];

      if (req.query.search) {
        birds = birds.filter((bird) => bird.commonName.toLowerCase().includes(req.query.search.toLowerCase()) || bird.nickname?.toLowerCase().includes(req.query.search.toLowerCase()));
      }

      let totalPages = birds.length;

      birds.sort((a, b) => a.commonName.localeCompare(b.commonName));

      for (let i = page, len = Math.min(page + birdsPerPage, birds.length); i < len; i++) {
        birds[i].hatched = req.query.loggedInUser ? await Counters.get('species', req.query.loggedInUser. birds[i].speciesCode) > 0 : false;

        birds[i].variants = BirdyPets.fetch('speciesCode', birds[i].speciesCode).filter((birdypet) => !birdypet.special).map((variant) => {
          return {
            id: variant.id,
            image: variant.image,
            label: variant.label
          };
        });

        output.push(birds[i]);
      }

      return res.json({
        totalPages: Math.ceil(totalPages / birdsPerPage),
        results: output
      });
      break;
    case "POST":
    case "DELETE":
      if (!req.body.loggedInUser) {
        return res.sendStatus(401);
      }

      await member.updateWishlist(req.body.speciesCode, req.method == "DELETE" ? "remove" : "add");

      return res.sendStatus(200);
      break;
    default:
      return res.sendStatus(405);
  }
};
