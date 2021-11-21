// Used to keep the API alive and prevent cold starts.

module.exports = (req, res) => {
	return res.sendStatus(204);
};
