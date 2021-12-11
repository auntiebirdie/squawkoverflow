const {
  PubSub
} = require('@google-cloud/pubsub');

exports.publish = function(topic, action, body) {
  return new Promise((resolve, reject) => {
    const pubsub = new PubSub();

    const data = {
      ...body,
      action
    };

    pubsub.topic(topic).publish(Buffer.from(JSON.stringify(data))).then(() => {
      resolve();
    });
  });
}

exports.receive = function(message, context) {
  const Illustration = require('./models/illustration.js');
  const Member = require('./models/member.js');

  const Cache = require('./helpers/cache.js');
  const Counters = require('./helpers/counters.js');
  const Redis = require('./helpers/redis.js');
  const Search = require('./helpers/search.js');
  const Webhook = require('./helpers/webhook.js');

  return new Promise(async (resolve, reject) => {
    var data = JSON.parse(Buffer.from(message.data, 'base64').toString());
    var member = new Member(data.member);
    var promises = [];

    await member.fetch();

	  await member.set({ lastRefresh : Date.now () });

    promises.push(Search.invalidate(member.id));

    promises.push(Search.get('BirdyPet', {
      member: member.id,
      page: 1,
      sort: 'hatchedAt',
      family: '',
      flock: '',
      search: ''
    }));

    promises.push(Search.get('BirdyPet', {
      member: member.id,
      page: 1,
      sort: 'commonName',
      family: '',
      flock: '',
      search: ''
    }));

    switch (data.action) {
      case "COLLECT":
        var illustration = new Illustration(data.illustration);

        await illustration.fetch();

        promises.push(Counters.increment(1, 'species', member.id, illustration.bird.code));

        if (member.settings.general?.includes('updateWishlist')) {
          promises.push(member.updateWishlist(illustration.bird.code, "remove"));
        }

        if (data.adjective) {
          promises.push(member.set({
            lastHatchedAt: Date.now()
          }));

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
        var illustration = new Illustration(data.illustration);

        await illustration.fetch();

        if (data.birdypet) {
          promises.push(Counters.increment(-1, 'species', data.member, illustration.bird.code));
        }

        let id = await Redis.create('freebird', illustration.id);

        promises.push(Redis.connect().sendCommand('EXPIRE', [`freebird:${id}`, 2628000]));
        promises.push(Cache.add('cache', 'freebirds', id));
        break;
    }

    Promise.all(promises).then(resolve);
  });
}
