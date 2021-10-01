const secrets = require('../secrets.json');
const uuid = require('short-uuid');
const Redis = require("redis").createClient(secrets.REDIS.MEMBERS.PORT, secrets.REDIS.MEMBERS.HOST);
Redis.auth(secrets.REDIS.MEMBERS.AUTH);

const {
  Datastore
} = require('@google-cloud/datastore');

const DB = new Datastore({
  namespace: 'squawkoverflow'
});

const {
  Client,
  Intents
} = require('discord.js');

const client = new Client({
  intents: [Intents.FLAGS.GUILDS, Intents.FLAGS.GUILD_MEMBERS]
});

      var birdypetsMasterlist = require('./newBirds.json');
      var flocksMasterlist = require('./newFlocks.json');

client.login(secrets.DISCORD.BOT_TOKEN);

client.on('error', (err) => {
  console.error(err);
});

client.on('ready', async () => {
  client.guilds.fetch("863864246835216464").then((guild) => {
    DB.runQuery(DB.createQuery('Member')).then(async ([members]) => {
      for (var i = 0, len = members.length; i < len; i++) {
        var memberId = members[i][Datastore.KEY].name;

        await guild.members.fetch(memberId).then((member) => {
          return Redis.hmset(
            `member:${memberId}`, {
              username: member.displayName,
              avatar: member.user.avatarURL() || "",
              joinedAt: member.joinedTimestamp,
              lastLogin: members[i].lastLogin,
              birdyBuddy: birdypetsMasterlist[members[i].birdyBuddy] || "",
              flock: flocksMasterlist[members[i].flock] || ""
            },
            function(err, response) {
              console.log(err);
            }
          );
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
