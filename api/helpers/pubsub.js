const {
  PubSub
} = require('@google-cloud/pubsub');

exports.publish = function(topic, action, body) {
  return new Promise((resolve, reject) => {
    const data = {
      ...body,
      action
    };

    if (process.env.NODE_ENV) {
      const pubsub = new PubSub();

      pubsub.topic(topic).publish(Buffer.from(JSON.stringify(data))).then(() => {
        resolve();
      });
    } else {
      exports.receive({
        data: Buffer.from(JSON.stringify(data))
      }, {
        eventId: Date.now()
      }).then(() => {
        resolve();
      });
    }
  });
}

exports.receive = function(message, context) {
  return new Promise(async (resolve, reject) => {
    const Variant = require(__dirname + '/../models/variant.js');
    const Member = require(__dirname + '/../models/member.js');

    const Database = require(__dirname + '/../helpers/database.js');
    const Webhook = require(__dirname + '/../helpers/webhook.js');

    var data = JSON.parse(Buffer.from(message.data, 'base64').toString());

    var member = new Member(data.member);
    var variant = new Variant(data.variant);

    var promises = [];

    await Promise.all([
      member.fetch(),
      variant.fetch()
    ]);

    switch (data.action) {
      case "COLLECT":
        if (data.adjective) {
          if (process.env.NODE_ENV == "PROD" && member.serverMember && (!member.settings.privacy?.includes('activity') || data.source == "DISCORD")) {
            promises.push(Webhook('egg-hatchery', {
              content: " ",
              embeds: [{
                title: variant.bird.commonName,
                description: `<@${member.id}> hatched the ${data.adjective} egg!`,
                url: `https://squawkoverflow.com/birdypet/${data.birdypet}`,
                image: {
                  url: variant.image
                }
              }]
            }));
          }
        }
        break;
      case "RELEASE":
        Database.create('freebirds', {
          id: Database.key(),
          variant: variant.id,
          freedAt: new Date(),
	  hatchedAt: data.hatchedAt ? new Date(data.hatchedAt) : new Date()
        });

        break;
    }

    Promise.all(promises).then(resolve);
  });
}
