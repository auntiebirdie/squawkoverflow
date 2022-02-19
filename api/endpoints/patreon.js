const Webhook = require('../helpers/webhook.js');

const crypto = require('crypto');
const secrets = require('../secrets.json');

module.exports = (req, res) => {
    let hmac = crypto.createHmac('md5', secrets.PATREON.SECRET);

    hmac.update(req.rawBody);

    let hash = hmac.digest('hex');

    console.log(req.headers['x-patreon-signature'], hash);

    /*
     // fight with this later .......
      if (req.headers['x-patreon-signature'] !== hash) {
        return res.sendStatus(403);
      }
    */

    var patron = req.body.included[1];
    var discord = patron.attributes.social_connections?.discord?.user_id;

    var embed = {
      title: req.headers['x-patreon-event'],
      url: 'https://www.patreon.com/squawkoverflow',
      description: discord ? `<@${discord}>` : `${patron.attributes.full_name}`
    };

    switch (req.headers['x-patreon-event']) {
        case 'members:pledge:create':
        embed.description += ' has become a patron!';
        break;
        case 'members:pledge:delete':
        embed.description += ' is no longer a patron!';
        break;
        case 'members:pledge:update':
        embed.description += ' has changed their pledge!'
        break;
      }


      Webhook('testing', {
        content: JSON.stringify(req.header),
        embeds: [embed]
      }).then(() => {
        res.sendStatus(200);
      });
    }
