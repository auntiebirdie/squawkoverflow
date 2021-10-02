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
      case "egg-hatchery":
        pubSubClient.topic('squawkoverflow-egg-hatchery').publish(Buffer.from(""), {
          member: `${data.member}`,
          birdypet: `${data.birdypet.id}`,
          adjective: `${data.adjective}`,
          userpet: `${data.userpet}`,
          source: "WEB"
        }).then((response) => {
          resolve();
        });
        break;
      case "exchange":
        var embeds = [
          new MessageEmbed()
          .setTitle(data.userpet.nickname ? data.userpet.nickname : data.birdypet.species.commonName)
          .setDescription(data.userpet.nickname ? data.birdypet.species.commonName : (data.birdypet.version + ' ' + data.birdypet.label))
          .setURL(`https://squawkoverflow.com/birdypet/${data.userpet._id}`)
          .setImage(data.birdypet.illustration)
        ];

        webhookClient.send({
          content: `${data.from.username} has sent <@${data.to}> a gift!`,
          embeds: embeds
        }).then((sent) => {
          webhookClient.editMessage(sent, {
            content: `<@${data.from.id}> has sent <@${data.to}> a gift!`,
            embeds: embeds
          }).then(() => {
            resolve();
          });
        });
        break;
      case "free-birds":
        pubSubClient.topic('squawkoverflow-free-birds').publish(Buffer.from(""), {
          member: `${data.member}`,
          birdypet: `${data.birdypet.id}`,
          source: "WEB"
        }).then((response) => {
          resolve();
        });
        break;
      default:
        return reject();
    }
  });
};

module.exports = new Webhook();
