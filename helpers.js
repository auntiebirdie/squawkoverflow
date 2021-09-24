const birdypets = require('./public/data/birdypets.json');
const secrets = require('./secrets.json');

const {
  MessageEmbed,
  MessageActionRow,
  MessageButton,
  WebhookClient
} = require('discord.js');


module.exports = {
  DB: require('./helpers/database.js'),
  Discord: {
    Webhook: {
      send: function(channel, data) {
        const webhookClient = new WebhookClient({
          id: secrets.DISCORD.WEBHOOK[channel].ID,
          token: secrets.DISCORD.WEBHOOK[channel].TOKEN
        });

        if (data.components) {
          var actionRow = new MessageActionRow().addComponents(data.components.map((componentData) => {
            return new MessageButton(componentData);
          }));
        }

        webhookClient.send({
          content: data.content,
          embeds: data.embeds.map((embedData) => {
            let embed = new MessageEmbed();

            for (let key in embedData) {
              embed[`set${key}`](embedData[key]);
            }

            return embed;
          }),
          components: actionRow ? [actionRow] : null
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
