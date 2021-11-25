const secrets = require('../secrets.json');
const https = require('https');

module.exports = function(webhook, data) {
  data = JSON.stringify(data);

  return new Promise((resolve, reject) => {
    const request = https.request({
        host: 'discord.com',
        path: `/api/webhooks/${secrets.DISCORD.WEBHOOK[webhook].ID}/${secrets.DISCORD.WEBHOOK[webhook].TOKEN}`,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': data.length
        }
      },
      (response) => {
          resolve();
      });

    request.write(data);

    request.end();
  });
}
