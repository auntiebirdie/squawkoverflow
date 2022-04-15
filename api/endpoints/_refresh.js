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
    let siteMembers = await Database.query('SELECT members.id `member`, members.avatar, member_auth.id, member_settings.value AS avatarSetting  FROM members LEFT JOIN member_auth ON (members.id = member_auth.member AND member_auth.provider = "discord") LEFT JOIN member_settings ON (members.id = member_settings.member AND member_settings.setting = "avatar")');
    let serverMembers = [];

    client.login(secrets.DISCORD.BOT_TOKEN);

    client.on('ready', () => {
      client.guilds.fetch(secrets.DISCORD.GUILD_ID).then((guild) => {
        let promises = [];

        for (let siteMember of siteMembers) {
          promises.push(guild.members.fetch(`${siteMember.id}`).then((serverMember) => {
            if (serverMember) {
              promises.push(Database.query('INSERT INTO member_badges VALUES (?, "discord", NOW()) ON DUPLICATE KEY UPDATE badge = badge', [siteMember.member]));

              return Database.set('members', {
                id: siteMember.member,
                avatar: !siteMember.avatarSetting || siteMember.avatarSetting == 'discord' ? serverMember.displayAvatarURL() : siteMember.avatar
              }, {
                serverMember: true
              });
            } else {
              promises.push(Database.query('DELETE FROM member_badges WHERE member = ? AND badge = "discord"', [siteMember.member]));

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
  }).then(async () => {
    await Database.query('UPDATE squawkdata.counters SET \`count\` = 0 WHERE type = "variant"');
    await Database.query('REPLACE INTO squawkdata.counters SELECT birdypets.member, "variant", birdypets.variant, COUNT(*) FROM birdypets WHERE birdypets.member IS NOT NULL GROUP BY \`member\`, \`variant\`');

    await Database.query('UPDATE squawkdata.counters SET \`count\` = 0 WHERE type = "species"');
    await Database.query('REPLACE INTO squawkdata.counters SELECT birdypets.member, "species", variants.species, COUNT(*) FROM birdypets JOIN variants ON (birdypets.variant = variants.id) WHERE birdypets.member IS NOT NULL GROUP BY \`member\`, variants.species');
    await Database.query('REPLACE INTO squawkdata.counters SELECT birdypets.member, "species", "total", COUNT(DISTINCT variants.species) FROM birdypets JOIN variants ON (birdypets.variant = variants.id) WHERE birdypets.member IS NOT NULL GROUP BY \`member\`');

    await Database.query('UPDATE squawkdata.counters SET \`count\` = 0 WHERE type = "family"');
    await Database.query('REPLACE INTO squawkdata.counters SELECT birdypets.member, "family", species.family, COUNT(DISTINCT variants.species) FROM birdypets JOIN variants ON (birdypets.variant = variants.id) JOIN species ON (variants.species = species.id) WHERE birdypets.member IS NOT NULL GROUP BY \`member\`, species.family');

    await Database.query('UPDATE squawkdata.counters SET \`count\` = 0 WHERE type = "eggs"');
    await Database.query('REPLACE INTO squawkdata.counters SELECT birdypets.member, "eggs", adjective, COUNT(DISTINCT variants.species) FROM species_adjectives JOIN variants ON (variants.species = species_adjectives.species) JOIN birdypets ON (birdypets.variant = variants.id) WHERE birdypets.member IS NOT NULL GROUP BY \`member\`, adjective');

    await Database.query('REPLACE INTO squawkdata.counters SELECT birdypets.member, "friendship", "total", COUNT(*) FROM birdypets WHERE friendship = 100 GROUP BY birdypets.member');

    await Database.query('REPLACE INTO squawkdata.counters SELECT birdypets.member, "aviary", "total", COUNT(*) FROM birdypets WHERE birdypets.member IS NOT NULL GROUP BY birdypets.member');

    return res.sendStatus(200);
  });
};
