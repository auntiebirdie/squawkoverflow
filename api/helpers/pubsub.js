const {
  PubSub
} = require('@google-cloud/pubsub');

exports.publish = function(topic, action, body) {
  return new Promise((resolve, reject) => {
    const data = {
      ...body,
      action
    };

    if (process.env.NODE_ENV == 'PROD') {
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
    const Member = require(__dirname + '/../models/member.js');

    const data = JSON.parse(Buffer.from(message.data, 'base64').toString());

    var member = new Member(data.member);
    var promises = [];

    switch (data.action) {
      case "COLLECT":
      case "RELEASE":
        const Database = require(__dirname + '/../helpers/database.js');
        const Redis = require(__dirname + '/../helpers/redis.js');
        const Variant = require(__dirname + '/../models/variant.js');
        const Webhook = require(__dirname + '/../helpers/webhook.js');

        var variant = new Variant(data.variant);

        await Promise.all([
          member.fetch({
            include: ['auth']
          }),
          variant.fetch()
        ]);

        if (data.action == "COLLECT") {
          if (data.adjective) {
            if (!member.settings.privacy_activity || data.source == "DISCORD") {
              Redis.connect().zadd('recentlyHatched', Date.now(), data.birdypet);
            }

            if (member.serverMember && (!member.settings.privacy_activity || data.source == "DISCORD")) {
              promises.push(Database.getOne('adjectives', {
                adjective: data.adjective
              }).then((egg) => {
                Webhook('birdwatching', {
                  content: " ",
                  embeds: [{
                    title: variant.bird.commonName,
                    description: `<@${member.auth.find((auth) => auth.provider == 'discord').id}> hatched the ${data.adjective} egg!`,
                    url: `https://squawkoverflow.com/birdypet/${data.birdypet}`,
                    image: {
                      url: variant.image
                    },
                    thumbnail: {
                      url: `https://storage.googleapis.com/squawkoverflow/${ egg.icon || 'eggs/D/default.png' }`
                    }
                  }]
                })
              }));
            }
          } else if (data.freebird) {
            if (member.serverMember && (!member.settings.privacy_activity || data.source == "DISCORD")) {
              Webhook('birdwatching', {
                content: " ",
                embeds: [{
                  title: variant.bird.commonName,
                  description: `<@${member.auth.find((auth) => auth.provider == 'discord').id}> excitedly adds a new bird to ${member.fetchPronoun('determiner')} aviary!`,
                  url: `https://squawkoverflow.com/birdypet/${data.birdypet}`,
                  image: {
                    url: variant.image
                  },
                  thumbnail: {
                    url: 'https://emojipedia-us.s3.dualstack.us-west-1.amazonaws.com/thumbs/120/twitter/282/hatching-chick_1f423.png'
                  }
                }]
              });
            }
          }
        } else {
          Database.create('freebirds', {
            id: Database.key(),
            variant: variant.id,
            freedAt: new Date(),
            hatchedAt: data.hatchedAt ? new Date(data.hatchedAt) : new Date()
          });
        }
    }

    Promise.all(promises).then(resolve);
  });
}
