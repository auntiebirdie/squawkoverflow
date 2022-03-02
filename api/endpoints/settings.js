const {
  Storage
} = require('@google-cloud/storage');

const storage = new Storage();
const bucket = storage.bucket('squawkoverflow');
const jimp = require('jimp');

const Database = require('../helpers/database.js');
const secrets = require('../secrets.json');

module.exports = (req, res) => {
  switch (req.method) {
    case "PUT":
      Database.replace('member_settings', {
        member: req.body.loggedInUser,
        setting: req.body.setting,
        value: req.body.value || 1
      }).then(async () => {
        if (req.body.setting == 'avatar') {
          var auth = await Database.query('SELECT id FROM member_auth WHERE `member` = ? AND provider = ? LIMIT 1', [req.body.loggedInUser, req.body.value]);

          switch (req.body.value) {
            case 'discord':
              const {
                Client,
                Intents
              } = require('discord.js');

              const client = new Client({
                intents: [Intents.FLAGS.GUILD_MEMBERS]
              });

              client.login(secrets.DISCORD.BOT_TOKEN);

              client.on('ready', () => {
                client.guilds.fetch(secrets.DISCORD.GUILD_ID).then(async (guild) => {
                  await guild.members.fetch(`${auth.id}`).then((member) => {
                    Database.set('members', {
                      id: req.body.loggedInUser
                    }, {
                      avatar: member.displayAvatarURL(),
                      serverMember: true
                    });
                  }).catch(() => {
                    client.users.fetch(`${auth.id}`).then((user) => {
                      Database.set('members', {
                        id: req.body.loggedInUser
                      }, {
                        avatar: user.avatarURL(),
                        serverMember: true
                      });
                    });
                  });

                  res.sendStatus(200);
                });
              });
              break;
            case 'google':
              const https = require('https');

              https.get(`https://people.googleapis.com/v1/people/${auth.id}?personFields=names&key=${secrets.GOOGLE.API_KEY}&personFields=photos`, (response) => {
                var data = "";

                response
                  .on('data', (chunk) => {
                    return data += chunk;
                  })
                  .on('end', async () => {
                    await Database.set('members', {
                      id: req.body.loggedInUser
                    }, {
                      avatar: JSON.parse(data).photos[0].url
                    });

                    res.sendStatus(200);
                  });
              });
              break;
            case 'birdatar':
              var rand = require('random-seed').create(req.body.loggedInUser);
              var url = 'https://storage.googleapis.com/squawkoverflow/';
              var filename = `birdatar/users/${req.body.loggedInUser.charAt(0)}/${req.body.loggedInUser}.png`;
              var file = bucket.file(filename);
              var layers = [{
                  id: 'tails',
                  components: 9
                },
                {
                  id: 'crests',
                  components: 10
                },
                {
                  id: 'body',
                  components: 9
                },
                {
                  id: 'wings',
                  components: 9
                },
                {
                  id: 'eyes',
                  components: 9
                },
                {
                  id: 'beaks',
                  components: 9
                },
                {
                  id: 'accessories',
                  components: 20
                }
              ];

              var base = await new jimp(256, 256);

              for (let layer of layers) {
                layer = await jimp.read(`${url}birdatar/${layer.id}/${rand(layer.components - 1) + 1}.png`);

                base.composite(layer, 0, 0);
              }

              base.getBuffer(jimp[`MIME_PNG`], async (err, buff) => {
                await file.save(buff);

                await Database.set('members', {
                  id: req.body.loggedInUser
                }, {
                  avatar: `${url}${filename}`
                });

                res.sendStatus(200);
              });
              break;
          }
        } else {
          return res.sendStatus(200);
        }
      });
      break;
    case "DELETE":
      Database.delete('member_settings', {
        member: req.body.loggedInUser,
        setting: req.body.setting
      }).then(() => {
        return res.sendStatus(200);
      });
      break;
    default:
      return res.sendStatus(405);
  }
};