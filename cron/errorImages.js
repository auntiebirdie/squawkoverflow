const axios = require('axios');
const secrets = require('../secrets.json');
const fs = require('fs');

axios.get(`https://api.unsplash.com/photos/random?query=bird&count=30&client_id=${secrets.UNSPLASH.ACCESS_KEY}`).then((results) => {
	var output = results.data.map((result) => {
		return {
			image: result.urls.regular,
			attribution: result.user.name,
			source: result.links.html
		};
	});

	fs.writeFileSync('../data/errorImages.json', JSON.stringify(output));
});
