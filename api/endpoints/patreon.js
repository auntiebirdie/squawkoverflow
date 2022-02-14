const Webhook = require('../helpers/webhook.js');

const crypto = require('crypto');
const secrets = require('../secrets.json');

module.exports = (req, res) => {
	console.log(req.headers['x-patreon-signature']);

	let hmac = crypto.createHmac('md5', secrets.PATREON[process.env.NODE_ENV == 'PROD' ? 'PROD' : 'DEV'].SECRET).update(req.body).digest('hex');

	console.log(hmac);

    if (req.headers['x-patreon-signature'] != hmac) {
      return res.sendStatus(403);
    }

    var patron = req.body.included[1];
    var discord = patron.attributes.social_connections?.discord?.user_id;

    Webhook('testing', {
      content: JSON.stringify(req.header),
      embeds: [{
        title: req.headers['x-patreon-event'],
        url: 'https://www.patreon.com/squawkoverflow',
        description: discord ? `<@${discord}> has become a patron!` : `${patron.attributes.full_name} has become a patron!`,
      }]
    }).then(() => {
      res.sendStatus(200);
    });
}
