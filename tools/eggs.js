const Database = require('../api/helpers/database.js');
const secrets = require('../api/secrets.json');

const {
  Storage
} = require('@google-cloud/storage');

const storage = new Storage();
const bucket = storage.bucket('squawkoverflow');
const Jimp = require('jimp');

const {
  Client,
  Intents
} = require('discord.js');

const client = new Client({
  intents: [Intents.FLAGS.GUILDS, Intents.FLAGS.GUILD_MEMBERS]
});

client.login(secrets.DISCORD.BOT_TOKEN);

client.on('ready', () => {
  client.guilds.fetch(secrets.EGGS[process.argv[2]]).then((guild) => {
    guild.emojis.fetch().then(async (emojis) => {
      let total = emojis.size;
      let i = 0;

      if (total > 0) {
        emojis.each(async (emoji) => {
          let icon = `eggs/${emoji.name.slice(0, 1).toUpperCase()}/${emoji.name}.png`;

          await Database.set('adjectives', {
            adjective: emoji.name
          }, {
            icon: icon
          });

          let file = bucket.file(icon);

          await new Promise((resolve, reject) => {
            Jimp.read(`https://cdn.discordapp.com/emojis/${emoji.id}.png`).then(async (image) => {
              image.getBuffer(Jimp[`MIME_PNG`], async (err, buff) => {
                console.log(emoji.id, emoji.name);

                await file.save(buff);

                i++;

                resolve();
              });
            });
          }).then(() => {
            if (i >= total) {
              process.exit(0);
            }
          });
        });
      } else {
        process.exit(0);
      }
    });
  });
});