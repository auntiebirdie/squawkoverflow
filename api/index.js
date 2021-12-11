exports.api = (req, res) => {
  if (req.query?.sort && req.query.sort == "[null]") {
    delete req.query.sort;
  }

  try {
    let route = req.path.match(/\/?(\b[A-Za-z\_]+\b)/);

    require(`./endpoints/${route[0]}.js`)(req, res);
  } catch (err) {
    console.error(err);
    res.sendStatus(404);
  }
}

exports.background = async (message, context) => {
  const Illustration = require('./models/illustration.js');
  const Member = require('./models/member.js');

  const Cache = require('./helpers/cache.js');
  const Counters = require('./helpers/counters.js');
  const Redis = require('./helpers/redis.js');
  const Webhook = require('./helpers/webhook.js');

  try {
    var member = new Member(message.json.member);

    await member.fetch();

    switch (message.json.action) {
      case "COLLECT":
        var illustration = new Illustration(message.json.illustration);

        await illustration.fetch();

        Counters.increment(1, 'species', member.id, illustration.bird.code);

        if (member.settings.general?.includes('updateWishlist')) {
          member.updateWishlist(illustration.bird.code, "remove");
        }

        if (message.json.adjective) {
          member.set({
            lastHatchedAt: Date.now()
          });

          if (!member.settings.privacy?.includes('activity')) {
            await Webhook('egg-hatchery', {
              content: " ",
              embeds: [{
                title: illustration.bird.name,
                description: `<@${member.id}> hatched the ${message.json.adjective} egg!`,
                url: `https://squawkoverflow.com/birdypet/${message.json.birdypet}`,
                image: {
                  url: illustration.image
                }
              }]
            });
          }
        } else if (message.json.freebird) {
          await Redis.connect().del(`freebird:${message.json.freebird}`);
          await Cache.remove('cache', 'freebirds', message.json.freebird);
        }
        break;
      case "RELEASE":
        var illustration = new Illustration(message.json.illustration);

        await Counters.increment(-1, 'species', message.json.member, illustration.bird.code);

        let id = await Redis.create('freebird', illustration.id);

        await Redis.connect().sendCommand('EXPIRE', [`freebird:${id}`, 2628000]);

        await Cache.add('cache', 'freebirds', id);
        break;
    }
  } catch (e) {}
}