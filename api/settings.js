const Database = require('../helpers/database.js');
const Birdatar = require('../helpers/birdatar.js');
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
                GatewayIntentBits
              } = require('discord.js');

              const client = new Client({
                intents: [GatewayIntentBits.GuildMembers]
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
                        serverMember: false
                      });
                    });
                  });

                  res.ok();
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

                    res.ok();
                  });
              });
              break;
            case 'birdatar':
              Birdatar.generate(req.body.loggedInUser).then(() => {
                return res.ok();
              });
              break;
          }
        } else if (req.body.setting == 'birdatar') {
          Birdatar.generate(req.body.loggedInUser).then(() => {
            return res.ok();
          });
        } else {
          return res.ok();
        }
      });
      break;
    case "DELETE":
      Database.delete('member_settings', {
        member: req.body.loggedInUser,
        setting: req.body.setting
      }).then(() => {
        return res.ok();
      });
      break;
    default:
      return res.ok();
  }
};
