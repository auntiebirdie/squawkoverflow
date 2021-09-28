const Chance = require('chance').Chance();
const secrets = require('../secrets.json');

const {
  MessageEmbed,
  MessageActionRow,
  MessageButton,
  WebhookClient
} = require('discord.js');


function Webhook() {}

Webhook.prototype.send = function(channel, data) {
  return new Promise( (resolve, reject) => {
  const webhookClient = new WebhookClient({
    id: secrets.DISCORD.WEBHOOK[channel].ID,
    token: secrets.DISCORD.WEBHOOK[channel].TOKEN
  });

  switch (channel) {
	  case "egg-hatchery":
		  webhookClient.send({
			  content: `<@${data.member}> hatched the ${data.adjective} egg and added the ${data.birdypet.species.commonName}  to their aviary!`,
			  embeds: [
				  new MessageEmbed()
.setTitle(data.birdypet.species.commonName)
				            .setDescription(data.birdypet.version + ' ' + data.birdypet.label)
				            .setURL(`https://squawkoverflow.com/birdypet/${data.userpet}`)
				            .setImage(data.birdypet.illustration)
				          ]
			        }).then( () => {
					              resolve();
					      });
		  break;
    case "exchange":
      webhookClient.send({
        content: `<@${data.from}> has sent <@${data.to}> a gift!`,
        embeds: [
          new MessageEmbed()
          .setTitle(data.userpet.nickname ? data.userpet.nickname : data.birdypet.species.commonName)
          .setDescription(data.userpet.nickname ? data.birdypet.species.commonName : (data.birdypet.version + ' ' + data.birdypet.label))
          .setURL(`https://squawkoverflow.com/birdypet/${data.userpet._id}`)
          .setImage(data.birdypet.illustration)
        ]
      }).then( () => {
	      resolve();
      });
      break;
    case "free-birds":
      webhookClient.send({
        content: Chance.pickone(require('../data/webhooks.json').release),
        embeds: [
          new MessageEmbed()
          .setTitle(data.birdypet.species.commonName)
          .setDescription(data.birdypet.version + ' ' + data.birdypet.label)
          .setImage(data.birdypet.illustration)
        ],
        components: [
          new MessageActionRow().addComponents([
            new MessageButton({
              type: 2,
              label: "Add to Aviary!",
              style: 1,
              customId: `birdypets_catch-${data.birdypet.id}`
            })
          ])
        ]
      }).then( (response) => {
	      resolve();
      });
      break;
    default:
      return reject();
  }
  });
};

module.exports = new Webhook();
