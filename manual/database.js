const helpers = require('../helpers.js');

    helpers.Redis.scan('memberpet').then( (memberpets) => {

	    for (memberpet of memberpets) {
		    var birdypet = helpers.BirdyPets.fetch(memberpet.birdypetId);

		    if (!memberpet.family) {
			    helpers.Redis.set('memberpet', memberpet._id, { family : birdypet.species.family });
		    }

		    if (!memberpet.species) {
			    helpers.Redis.set('memberpet', memberpet._id, { species : birdypet.species.commonName });
		    }
	    }

	    process.exit(0);
    });
