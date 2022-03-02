const secrets = require('../secrets.json');

const Database = require('../helpers/database.js');

const {
  Client,
  Intents
} = require('discord.js');

const client = new Client({
  intents: [Intents.FLAGS.GUILD_MEMBERS]
});

module.exports = async (req, res) => {
  return new Promise(async (resolve, reject) => {
    let siteMembers = await Database.query('SELECT * FROM member_auth WHERE provider = "discord"');
    let serverMembers = [];

    client.login(secrets.DISCORD.BOT_TOKEN);

    client.on('ready', () => {
      client.guilds.fetch(secrets.DISCORD.GUILD_ID).then((guild) => {
        let promises = [];

        for (let siteMember of siteMembers) {
          promises.push(guild.members.fetch(`${siteMember.id}`).then((serverMember) => {
            if (serverMember) {
              return Database.set('members', {
                id: siteMember.member
              }, {
                serverMember: true
              });
            } else {
              return Database.set('members', {
                id: siteMember.member
              }, {
                serverMember: false
              });
            }
          }));
        }

        Promise.allSettled(promises).then(resolve);
      });
    });
  }).then(() => {
    return res.sendStatus(200);
  });
};
