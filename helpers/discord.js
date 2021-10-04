const secrets = require('../secrets.json');
const redis = require('./redis.js');

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
    redis.fetch({
      kind: "member",
      limit: 50
    }).then(async (members) => {
      for (var i = 0, len = members.length; i < len; i++) {
        await guild.members.fetch(members[i]._id).then((member) => {
		redis.set('member', member.id, {
			username: member.displayName,
			avatar: member.user.avatarURL()
		});
        });
      }

	    process.exit(0);
    });
  });
});
