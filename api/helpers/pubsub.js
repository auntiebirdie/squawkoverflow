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
    const Variant = require(__dirname + '/../models/variant.js');
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
    var variant = new Variant(data.variant);

    var promises = [];

    await Promise.all([
      member.fetch(),
      variant.fetch()
    ]);

    switch (data.action) {
      case "COLLECT":
        promises.push(Cache.add('aviary', member.id, [Date.now(), data.birdypet]));
        promises.push(Counters.increment(1, 'aviary', member.id));
        promises.push(Counters.increment(1, 'species', member.id, variant.bird.code, true));

        if (member.settings.general?.includes('updateWishlist')) {
          promises.push(member.updateWishlist(variant.bird.code, "remove"));
        }

        if (data.adjective) {
          if (process.env.NODE_ENV && (!member.settings.privacy?.includes('activity') || data.source == "DISCORD")) {
            // TODO: check that user is a valid server member
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
        } else if (data.freebird) {
          promises.push(Database.delete('FreeBird', variant.id));
          promises.push(Cache.remove('cache', 'freebirds', variant.id));
        }
        break;
      case "GIFT":
        promises.push(Cache.remove('aviary', member.id, birdypet.id));
        promises.push(Counters.increment(-1, 'aviary', member.id));
        promises.push(Counters.increment(-1, 'species', member.id, variant.bird.code, true));
        break;
      case "RELEASE":
        Database.save('FreeBird', variant.id, {
          releasedAt: Date.now()
        }).then(() => {
          Cache.add('cache', 'freebirds', variant.id);
        });

        if (data.birdypet) {
          promises.push(Cache.remove('aviary', member.id, birdypet.id));
          promises.push(Counters.increment(-1, 'aviary', member.id));
          promises.push(Counters.increment(-1, 'species', member.id, variant.bird.code, true));
        }

        break;
    }

    promises.push(Search.invalidate(member.id));

    Promise.all(promises).then(resolve);
  });
}
