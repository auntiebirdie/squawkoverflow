const Chance = require('chance').Chance();
const secrets = require('../secrets.json');

const {
  MessageEmbed,
  MessageActionRow,
  MessageButton,
  WebhookClient
} = require('discord.js');

const {
  PubSub
} = require('@google-cloud/pubsub');
const pubSubClient = new PubSub();

function Webhook() {}

Webhook.prototype.send = function(channel, data) {
  return new Promise((resolve, reject) => {
    const webhookClient = new WebhookClient({
      id: secrets.DISCORD.WEBHOOK[channel].ID,
      token: secrets.DISCORD.WEBHOOK[channel].TOKEN
    });

    switch (channel) {
      case "exchange":
        var embeds = [
          new MessageEmbed()
          .setAuthor(data.userpet.nickname || " ")
          .setTitle(data.birdypet.species.commonName)
          .setDescription(data.birdypet.label)
          .setURL(`https://squawkoverflow.com/birdypet/${data.userpet._id}`)
          .setImage(`https://storage.googleapis.com/birdypets/${data.birdypet.species.order}/${data.birdypet.species.family}/${data.birdypet.species.scientificName.replace(' ', '%20')}/${data.birdypet.id}.${data.birdypet.filetype ? data.birdypet.filetype : "jpg"}`)
        ];

        var content = `${data.from} has sent <@${data.to}> a gift!`;
        break;
      default:
        return reject();
    }

    webhookClient.send({
      content: content,
      embeds: embeds
    }).then(() => {
      resolve();
    });
  });
};

module.exports = new Webhook();