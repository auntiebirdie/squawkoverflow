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
    const Bird = require(__dirname + '/../models/bird.js');
    const BirdyPet = require(__dirname + '/../models/birdypet.js');
    const Illustration = require(__dirname + '/../models/illustration.js');
    const Member = require(__dirname + '/../models/member.js');

    const Cache = require(__dirname + '/../helpers/cache.js');
    const Counters = require(__dirname + '/../helpers/counters.js');
    const Database = require(__dirname + '/../helpers/database.js');
    const Search = require(__dirname + '/../helpers/search.js');
    const Webhook = require(__dirname + '/../helpers/webhook.js');

    var data = JSON.parse(Buffer.from(message.data, 'base64').toString());

    console.log(data);

    var birdypet = new BirdyPet(data.birdypet);
    var member = new Member(data.member);
    var illustration = new Illustration(data.illustration);

    var promises = [];

    await Promise.all([
      member.fetch(),
      illustration.fetch()
    ]);

    switch (data.action) {
      case "COLLECT":
        promises.push(Cache.add('aviary', member.id, [Date.now(), data.birdypet]));
        promises.push(Counters.increment(1, 'aviary', member.id));
        promises.push(Counters.increment(1, 'species', member.id, illustration.bird.code, true));

        if (member.settings.general?.includes('updateWishlist')) {
          promises.push(member.updateWishlist(illustration.bird.code, "remove"));
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
          promises.push(Database.delete('FreeBird', illustration.id));
          promises.push(Cache.remove('cache', 'freebirds', illustration.id));
        }
        break;
      case "GIFT":
        promises.push(Cache.remove('aviary', member.id, birdypet.id));
        promises.push(Counters.increment(-1, 'aviary', member.id));
        promises.push(Counters.increment(-1, 'species', member.id, illustration.bird.code, true));
        break;
      case "RELEASE":
        Database.save('FreeBird', illustration.id, {
          releasedAt: Date.now()
        }).then(() => {
          Cache.add('cache', 'freebirds', illustration.id);
        });

        if (data.birdypet) {
          promises.push(Cache.remove('aviary', member.id, birdypet.id));
          promises.push(Counters.increment(-1, 'aviary', member.id));
          promises.push(Counters.increment(-1, 'species', member.id, illustration.bird.code, true));
        }

        break;
    }

    promises.push(Search.invalidate(member.id));

    Promise.all(promises).then(resolve);
  });
}
