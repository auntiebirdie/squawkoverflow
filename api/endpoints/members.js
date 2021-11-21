const Members = require('../collections/members.js');

module.exports = (req, res) => {
	let collection = new Members();

	return collection.all().then( (members) => {
		return res.json(members);
	});
};
