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
    const Chance = require('chance').Chance();

    const data = JSON.parse(Buffer.from(message.data, 'base64').toString());

    var member = new Member(data.member);
    var promises = [];

    switch (data.action) {
      case "COLLECT":
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

        Database.query('SELECT `count` FROM counters WHERE (`member` = ? OR `member` = "SQUAWK") AND type = "species" AND id = "total" GROUP BY `member` ORDER BY FIELD(`member`, "SQUAWK") DESC', [member.id]).then(async (totals) => {
          if (totals.length > 1 && totals[1].count >= totals[0].count) {
            await Database.query('INSERT INTO member_badges VALUES (?, "completionist", NOW()) ON DUPLICATE KEY UPDATE badge = badge', [this.member]);
          }
        });

        if (member.serverMember && !member.settings.privacy_activity) {
          if (data.adjective) {
            promises.push(Redis.zadd('recentlyHatched', Date.now(), data.birdypet, (err, results) => {
              Redis.zcount('recentlyHatched', '-inf', '+inf', (err, count) => {
                if (count > 5) {
                  return Redis.zremrangebyrank('recentlyHatched', 0, 0);
                }
              });
            }));
          } else if (data.birthday) {
            Webhook('squawkchat', {
              content: " ",
              embeds: [{
                title: variant.bird.commonName,
                description: `Happy BirdDay, <@${member.auth.find((auth) => auth.provider == 'discord').id}>!!`,
                url: `https://squawkoverflow.com/birdypet/${data.birdypet}`,
                image: {
                  url: variant.image
                },
                thumbnail: {
                  url: 'https://storage.googleapis.com/squawkoverflow/stickers/unboxing_5784126.png'
                }
              }]
            });
          }
        }
        break;
    }

    Promise.all(promises).then(resolve);
  });
}
