const https = require('https');
const secrets = require('../secrets.json');

module.exports = function(webhook, data) {
  webhook = process.env.NODE_ENV == 'PROD' ? webhook : 'testing';

  return new Promise((resolve, reject) => {
    const req = https.request(`https://discord.com/api/webhooks/${secrets.DISCORD.WEBHOOK[webhook].ID}/${secrets.DISCORD.WEBHOOK[webhook].TOKEN}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
      },
      (res) => {
        res.on('data', () => {});

        res.on('end', () => {
          resolve();
        });
      });

    req.write(JSON.stringify(data));

    req.end();
  });
}
