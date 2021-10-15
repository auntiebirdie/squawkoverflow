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

		    if (!memberpet.flocks || memberpet.flocks.length == 0) {
			    helpers.Redis.set('memberpet', memberpet._id, { flocks : "NONE" });
		    }
	    }

	    process.exit(0);
    });
