const secrets = require('../secrets.json');
const Database = require('../helpers/database.js');

const {
  Client,
  GatewayIntentBits
} = require('discord.js');

const client = new Client({
  intents: [GatewayIntentBits.Guilds,  GatewayIntentBits.GuildMembers]
});

(async () => {
  let siteMembers = await Database.query('SELECT members.id `member`, members.supporter, members.contributor, members.avatar, member_auth.id, member_settings.value AS avatarSetting FROM members LEFT JOIN member_auth ON (members.id = member_auth.member AND member_auth.provider = "discord") LEFT JOIN member_settings ON (members.id = member_settings.member AND member_settings.setting = "avatar")');
  client.login(secrets.DISCORD.BOT_TOKEN);

  client.on('ready', () => {
    client.guilds.fetch(secrets.DISCORD.GUILD_ID).then((guild) => {
      guild.members.fetch().then(async (serverMembers) => {
        let promises = [];

        for (let siteMember of siteMembers) {
          let serverMember = serverMembers.get(siteMember.id);

          if (serverMember) {
            promises.push(serverMember.roles[siteMember.supporter == 1 ? 'add' : 'remove']('1001922198417711144'));

            promises.push(serverMember.roles[siteMember.contributor ? 'add' : 'remove']('1001930991427928215'));

            Database.set('members', {
              id: siteMember.member
            }, {
              avatar: !siteMember.avatarSetting || siteMember.avatarSetting == 'discord' ? serverMember.displayAvatarURL() : siteMember.avatar,
              serverMember: true
            });
          } else {
            Database.set('members', {
              id: siteMember.member
            }, {
              serverMember: false
            });
          }
        }

        Promise.allSettled(promises).then(() => {
          process.exit(0);
        });
      });
    });
  });
})();
