const secrets = require('../secrets.json');

const Member = require('../models/member.js');

module.exports = (req, res) => {
  return new Promise(async (resolve, reject) => {
    switch (req.method) {
      case 'POST':
        var member = new Member({
          id: req.body.loggedInUser
        });

        await member.fetch({
          include: ['auth']
        });

        var id = member.auth.find((auth) => auth.provider == req.body.provider);

        if (!id) {
          res.sendStatus(500);
          resolve();
        } else {
          if (req.body.provider == 'discord') {
            const {
              Client,
              Intents
            } = require('discord.js');

            const client = new Client({
              intents: [Intents.FLAGS.GUILD_MEMBERS]
            });

            client.login(secrets.DISCORD.BOT_TOKEN);

            client.on('ready', () => {
              client.guilds.fetch(secrets.DISCORD.GUILD_ID).then((guild) => {
                guild.members.fetch(`${id}`).then((serverMember) => {
                  Database.set('members', {
                    id: siteMember.member
                  }, {
                    username: serverMember.displayName,
                    avatar: serverMember.displayAvatarURL(),
                    serverMember: true
                  }).then(() => {
                    res.sendStatus(200);
                    resolve();
                  });
                }).catch((err) => {
                  client.users.fetch(`${id}`).then((discordMember) => {
                    Database.set('members', {
                      id: siteMember.member
                    }, {
                      username: discordMember.username,
                      avatar: discordMember.avatarURL(),
                      serverMember: false
                    }).then(() => {
                      res.sendStatus(200);
                      resolve();
                    });
                  }).catch((err) => {
                    res.sendStatus(500);
                    resolve();
                  });
                });
              });
            });
	  }
        }
        break;
    }
  })
}
