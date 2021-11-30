const Birds = require('../collections/birds.js');
const BirdyPets = require('../collections/birdypets.js');

module.exports = async (req, res) => {
  var bird = Birds.findBy('speciesCode', req.query.speciesCode);
  var variants = await new BirdyPets('speciesCode', req.query.speciesCode);

  if (req.query.loggedInUser) {
    await Promise.all(variants.map((variant) => variant.fetchMemberData(req.query.loggedInUser)));
  }

  variants.forEach( (variant) => delete variant.species );
 
  bird.variants = variants;

  res.json(bird);
}
