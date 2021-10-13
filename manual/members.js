const secrets = require('../secrets.json');
const Helpers = require('../helpers.js');

const {
  Client,
  Intents
} = require('discord.js');

const client = new Client({
  intents: [Intents.FLAGS.GUILDS, Intents.FLAGS.GUILD_MEMBERS]
});

client.login(secrets.DISCORD.BOT_TOKEN);

client.on('error', (err) => {
  console.error(err);
});

client.on('ready', async () => {
  client.guilds.fetch("863864246835216464").then((guild) => {
    Helpers.Redis.scan('member').then(async (members) => {
      for (var i = 0, len = members.length; i < len; i++) {
        var memberId = members[i]._id;
        await guild.members.fetch(memberId).then(async (member) => {
		await Helpers.Redis.save('member', memberId, {
			username: member.displayName,
			avatar: member.user.avatarURL() || "",
			lastLogin: members[i].lastLogin,
			joinedAt: member.joinedTimestamp,
			lastHatchedAt: members[i].lastHatchedAt || 0,
			tier: members[i].tier || 0,
			flock: members[i].flock,
			birdyBuddy: members[i].birdyBuddy
		});
        }).catch((err) => {
          client.users.fetch(memberId).then((user) => {
            console.log('USER', user);
          });
        });
      }

      console.log("DONE!");
    });
  });
});
