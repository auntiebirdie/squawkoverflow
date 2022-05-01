const {
  Storage
} = require('@google-cloud/storage');

const Bird = require('../models/bird.js');
const Database = require('../helpers/database.js');
const Member = require('../models/member.js');
const Webhook = require('../helpers/webhook.js');
const Variant = require('../models/variant.js');

const secrets = require('../secrets.json');
const Tumblr = require('tumblr.js');
const storage = new Storage();
const bucket = storage.bucket('squawkoverflow');
const Jimp = require('jimp');
const uuid = require('short-uuid');

module.exports = async (req, res) => {
  switch (req.method) {
    case "GET":
      let variant = new Variant(req.query.id);

      await variant.fetch({
        include: req.query.include
      });

      res.json(variant);
      break;
    case "POST":
      var existing = null;
      var data = req.body;

      var member = new Member(req.body.loggedInUser);

      await member.fetch();

      if (!member.admin && !member.contributor) {
        return res.sendStatus(403);
      }

      switch (data.url.split('.').pop().toLowerCase()) {
        case 'png':
          data.filetype = 'png';
          break;
        default:
          data.filetype = 'jpg';
      }

      if (data.id) {
        existing = await Database.query('SELECT * FROM variants WHERE id = ?', [data.id]).then(([result]) => result);
      }

      if (existing) {
        var key = existing.id;
        await Database.query('UPDATE variants SET source = ?, subspecies = ?, credit = ?, full = ?, special = ?, filetype = ?, label = ? WHERE id = ?', [data.source, data.subspecies, data.credit.trim(), data.full, data.special, data.filetype, data.label, key]);
      } else {
        var key = uuid.generate();
        await Database.query('INSERT INTO variants VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())', [key, data.species, data.subspecies, data.label, data.credit.trim(), data.source, data.url, data.filetype, data.full, data.special]);
      }

      if (data.artist) {
        await Database.query('INSERT IGNORE INTO member_badges VALUES (?, "artist", NOW())', [data.artist]);
        await Database.query('DELETE FROM member_variants WHERE variant = ? AND type = "artist"', [key]);
        await Database.query('INSERT IGNORE INTO member_variants VALUES (?, ?, "artist")', [data.artist, key]);
      }

      if (data.url && !data.url.startsWith('https://storage.googleapis.com/squawkoverflow')) {
        let bird = new Bird(data.species);

        await bird.fetch();

        let file = bucket.file(`birds/${key.slice(0, 1)}/${key.slice(0, 2)}/${key}.${data.filetype}`);

        await Jimp.read(data.url).then(async (image) => {
          var mimes = {
            "jpg": "JPEG",
            "jpeg": "JPEG",
            "png": "PNG"
          };

          if (image.bitmap.height > 600) {
            await image.resize(Jimp.AUTO, 600);
          }

          await image
            .autocrop()
            .quality(90)
            .getBuffer(Jimp[`MIME_${mimes[data.filetype]}`], async (err, buff) => {
              await file.save(buff);

              let variant = new Variant(key);

              await variant.fetch({
                include: ['adjectives']
              });

              if (!existing && !variant.special) {
                let fields = [];

                if (data.subspecies) {
                  fields.push({
                    name: 'Subspecies',
                    value: data.subspecies,
                    inline: true
                  });
                }

                if (data.label) {
                  fields.push({
                    name: 'Label',
                    value: data.label,
                    inline: true
                  });
                }

                Webhook('updates', {
                  content: "A new variant has been added!",
                  embeds: [{
                    title: bird.commonName,
                    url: `https://squawkoverflow.com/birdypedia/bird/${bird.id_slug}?variant=${key}`,
                    fields: fields,
                    image: {
                      url: variant.image
                    },
                    author: {
                      name: `© ${data.credit}`,
                      url: data.source
                    }
                  }]
                });

                const tumblr = Tumblr.createClient({
                  consumer_key: secrets.TUMBLR.OAUTH_KEY,
                  consumer_secret: secrets.TUMBLR.OAUTH_SECRET,
                  token: secrets.TUMBLR.squawkoverflow.OAUTH_TOKEN,
                  token_secret: secrets.TUMBLR.squawkoverflow.OAUTH_TOKENSECRET
                });

                let lastEgg = variant.bird.adjectives.pop();


                await new Promise((resolve, reject) => {
                  tumblr.createPhotoPost('squawkoverflow', {
                    type: 'photo',
                    state: 'queue',
                    tags: ['squawkoverflow', bird.commonName, bird.scientificName, 'birds', data.credit].join(',').toLowerCase(),
                    source_url: data.source,
                    source: variant.image,
                    caption: `<h2>A new variant has been added!</h2><p>${bird.commonName} <i>(${bird.scientificName})</i><br><a href="${data.source}">© ${data.credit}</a></p><p>It hatches from ${variant.bird.adjectives.join(', ')}, and ${lastEgg} eggs.</p><p><a href="https://squawkoverflow.com/">squawkoverflow - the ultimate bird collecting game</a><br>&nbsp; &nbsp; &nbsp; &nbsp; &nbsp;🥚 hatch &nbsp; &nbsp;❤️ collect &nbsp; &nbsp; 🤝 connect</p>`
                  }, function(err, resp) {
                    console.log(err, resp);
                    resolve();
                  });
                });
              }

              res.json(data.id);
            });
        });
      } else {
        res.json(data.id);
      }

      break;
    default:
      return res.sendStatus(405);
  }
};