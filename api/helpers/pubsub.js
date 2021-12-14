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
  const Redis = require(__dirname + '/../helpers/redis.js');

  return new Promise((resolve, reject) => {
    Redis.get('pubsub', context.eventId).then(async (result) => {
      if (!result) {
        Redis.set('pubsub', context.eventId, "🐦");
        Redis.connect().sendCommand('EXPIRE', [`pubsub:${context.eventId}`, 300]);

        const Bird = require(__dirname + '/../models/bird.js');
        const Illustration = require(__dirname + '/../models/illustration.js');
        const Member = require(__dirname + '/../models/member.js');

        const Cache = require(__dirname + '/../helpers/cache.js');
        const Counters = require(__dirname + '/../helpers/counters.js');
        const Search = require(__dirname + '/../helpers/search.js');
        const Webhook = require(__dirname + '/../helpers/webhook.js');

        var data = JSON.parse(Buffer.from(message.data, 'base64').toString());
        var member = new Member(data.member);
        var promises = [];

        await member.fetch();

        switch (data.action) {
          case "COLLECT":
            var illustration = new Illustration(data.illustration);

            await illustration.fetch();

            promises.push(Cache.add('aviary', member.id, [Date.now(), data.birdypet]));

            if (member.settings.general?.includes('updateWishlist')) {
              promises.push(member.updateWishlist(illustration.bird.code, "remove"));
            }

            var bird = new Bird(illustration.bird.code);

            await bird.fetch();

            for (let adjective of bird.adjectives) {
              promises.push(Counters.refresh('eggs', member.id, adjective));
            }

            if (data.adjective) {
              if (!member.settings.privacy?.includes('activity')) {
                promises.push(Webhook('egg-hatchery', {
                  content: " ",
                  embeds: [{
                    title: illustration.bird.name,
                    description: `<@${member.id}> hatched the ${data.adjective} egg!`,
                    url: `https://squawkoverflow.com/birdypet/${data.birdypet}`,
                    image: {
                      url: illustration.image
                    }
                  }]
                }));
              }
            } else if (data.freebird) {
              promises.push(Redis.connect().del(`freebird:${data.freebird}`));
              promises.push(Cache.remove('cache', 'freebirds', data.freebird));
            }
            break;
          case "RELEASE":
            let id = await Redis.create('freebird', data.illustration);

            if (data.birdypet) {
              promises.push(Cache.remove('aviary', data.member, data.birdypet));
            }

            promises.push(Redis.connect().sendCommand('EXPIRE', [`freebird:${id}`, 2628000]));
            promises.push(Cache.add('cache', 'freebirds', id));
            break;
        }

        promises.push(Search.invalidate(member.id));

        Promise.all(promises).then(resolve);
      } else {
        resolve(null);
      }
    });
  });
}
