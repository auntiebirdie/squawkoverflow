const secrets = require('../secrets.json');

const Database = require('../helpers/database.js');
const Members = require('../collections/members.js');

const {
  Client,
  Intents
} = require('discord.js');

const client = new Client({
  intents: [Intents.FLAGS.GUILD_MEMBERS]
});

//module.exports = async (req, res) => {
return new Promise(async (resolve, reject) => {
  let siteMembers = await Members.all();
  let serverMembers = [];

  client.login(secrets.DISCORD.BOT_TOKEN);

  client.on('ready', () => {
    client.guilds.fetch(secrets.DISCORD.GUILD_ID).then((guild) => {
      let promises = [];

      for (let siteMember of siteMembers) {
        promises.push(guild.members.fetch(`${siteMember.id}`).then((serverMember) => {
          if (serverMember) {
            return Database.set('members', {
              id: serverMember.id
            }, {
              username: serverMember.displayName,
              avatar: serverMember.displayAvatarURL(),
              serverMember: true
            });
          } else {
            return Database.set('members', {
              id: serverMember.id
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
//};