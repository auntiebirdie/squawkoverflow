const Webhook = require('../helpers/webhook.js');

const crypto = require('crypto');
const secrets = require('../secrets.json');

module.exports = (req, res) => {
  return new Promise(async (resolve, reject) => {
    if (req.header['x-patreon-signature'] != crypto.createHmac('md5', secrets.PATREON.SECRET).update(JSON.stringify(req.body)).digest('hex')) {
      res.sendStatus(403);
    }

    Webhook('testing', {
      content: '<@121294882861088771>',
      embeds: [{
        title: req.header['x-patreon-event'],
	      description: JSON.stringify(req.body.data)
      }]
    }).then(() => {
      res.sendStatus(200);
    });
  });
};
