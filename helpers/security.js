const secrets = require('../secrets.json');
const Crypto = require ("crypto");

function Security() {}

Security.prototype.init = function (user) {
	user.CRYPTO = [Crypto.randomBytes(32).toString('hex'), Crypto.randomBytes(16).toString('hex')]

	console.log(user.CRYPTO);
}

Security.prototype.encrypt = function (user, data) {
	const cipher = Crypto.createCipheriv('aes-256-cbc', Buffer.from(user.CRYPTO[0], 'hex'), Buffer.from(user.CRYPTO[1], 'hex'));

	var output = cipher.update(data, 'utf-8', 'hex');
	
	output += cipher.final('hex');

	console.log('ENCRYPT', data);

	return output;
}

Security.prototype.decrypt = function (user, data) {
	console.log(user.CRYPTO, data);
	const decipher = Crypto.createDecipheriv('aes-256-cbc', Buffer.from(user.CRYPTO[0], 'hex'), Buffer.from(user.CRYPTO[1], 'hex'));

	var output = decipher.update(data, 'utf-8', 'hex');
	console.log(output);
	
	output += decipher.final('hex');

	return output;
}

module.exports = new Security();
