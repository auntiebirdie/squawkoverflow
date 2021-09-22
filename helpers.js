const birdypets = require('./public/data/birdypets.json');
const secrets = require('./secrets.json');

const {
  MessageEmbed,
  WebhookClient
} = require('discord.js');

const webhookClient = new WebhookClient({
  id: secrets.DISCORD.WEBHOOK_ID,
  token: secrets.DISCORD.WEBHOOK_TOKEN
});

module.exports = {
  DB: require('./helpers/database.js'),
  Discord: {
    Webhook: {
      send: function(data) {
        webhookClient.send({
          content: data.content,
          embeds: data.embeds.map((embedData) => {
            let embed = new MessageEmbed();

            for (let key in embedData) {
              embed[`set${key}`](embedData[key]);
            }

		  return embed;
          })
        });
      }
    }
  },
  BirdyPets: {
    fetch: function(id) {
      return birdypets.find((birdypet) => birdypet.id == id);
    }
  }
}
