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

exports.background = (message, context) => {
  const Illustration = require('./models/illustration.js');
  const Member = require('./models/member.js');

  const Cache = require('./helpers/cache.js');
  const Counters = require('./helpers/counters.js');
  const Redis = require('./helpers/redis.js');
  const Search = require('./helpers/search.js');
  const Webhook = require('./helpers/webhook.js');

  return new Promise(async (resolve, reject) => {
    var member = new Member(message.attributes.member);
    var promises = [];

    await member.fetch();

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

    switch (message.attributes.action) {
      case "COLLECT":
        var illustration = new Illustration(message.attributes.illustration);

        await illustration.fetch();

        promises.push(Counters.increment(1, 'species', member.id, illustration.bird.code));

        if (member.settings.general?.includes('updateWishlist')) {
          promises.push(member.updateWishlist(illustration.bird.code, "remove"));
        }

        if (message.attributes.adjective) {
          promises.push(member.set({
            lastHatchedAt: Date.now()
          }));

          if (!member.settings.privacy?.includes('activity')) {
            promises.push(Webhook('egg-hatchery', {
              content: " ",
              embeds: [{
                title: illustration.bird.name,
                description: `<@${member.id}> hatched the ${message.attributes.adjective} egg!`,
                url: `https://squawkoverflow.com/birdypet/${message.attributes.birdypet}`,
                image: {
                  url: illustration.image
                }
              }]
            }));
          }
        } else if (message.attributes.freebird) {
          promises.push(Redis.connect().del(`freebird:${message.attributes.freebird}`));
          promises.push(Cache.remove('cache', 'freebirds', message.attributes.freebird));
        }
        break;
      case "RELEASE":
        var illustration = new Illustration(message.attributes.illustration);

        await illustration.fetch();

        if (message.attributes.birdypet) {
          promises.push(Counters.increment(-1, 'species', message.attributes.member, illustration.bird.code));
        }

        let id = await Redis.create('freebird', illustration.id);

        promises.push(Redis.connect().sendCommand('EXPIRE', [`freebird:${id}`, 2628000]));
        promises.push(Cache.add('cache', 'freebirds', id));
        break;
    }

    Promise.all(promises).then(resolve);
  });
}