const secrets = require('../secrets.json');

const {
  WebhookClient
} = require('discord.js');

module.exports = function(webhook, data) {
  webhook = process.env.K_SERVICE == 'api' ? webhook : "testing";

  return new Promise((resolve, reject) => {
    const webhookClient = new WebhookClient({
      id: secrets.DISCORD.WEBHOOK[webhook].ID,
      token: secrets.DISCORD.WEBHOOK[webhook].TOKEN
    });

    webhookClient.send(data).then(() => {
      resolve();
    });
  });
}
